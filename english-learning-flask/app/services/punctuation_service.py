from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification
import torch

class PunctuationService:
    def __init__(self, model_name="oliverguhr/fullstop-punctuation-multilang-large"):
        """
        Initialize the punctuation model.
        Note: This is heavy and should ideally be a singleton or loaded in a background worker.
        """
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.pipe = None

    def _load_model(self):
        if self.pipe is None:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForTokenClassification.from_pretrained(self.model_name)
            self.pipe = pipeline(
                "ner", 
                model=self.model, 
                tokenizer=self.tokenizer, 
                aggregation_strategy="none",
                device=0 if torch.cuda.is_available() else -1
            )

    def restore_punctuation(self, text):
        """Restore punctuation to unpunctuated text in chunks."""
        if not text:
            return ""

        self._load_model()
        words = text.split()
        chunk_size = 200  # Words per chunk
        all_results = []

        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i : i + chunk_size])
            results = self.pipe(chunk)

            current_word = ""
            current_punct = ""

            for r in results:
                token = r["word"]
                label = r["entity"]

                if token.startswith("\u2581"):  # New word marker for XLM-Roberta
                    if current_word:
                        all_results.append(current_word + current_punct)
                    current_word = token[1:]
                    current_punct = ""
                else:
                    current_word += token

                # Update punctuation labels (0 to 5)
                labels = {"0": "", "LABEL_0": "", ".": ".", "LABEL_1": ".", ",": ",", "LABEL_2": ",", 
                          "?": "?", "LABEL_3": "?", "-": "-", "LABEL_4": "-", ":": ":", "LABEL_5": ":"}
                if label in labels:
                    current_punct = labels[label]

            if current_word:
                all_results.append(current_word + current_punct)

        # Capitalization logic
        output = []
        capitalize_next = True
        for word in all_results:
            if capitalize_next and word:
                word = word[0].upper() + word[1:]
                capitalize_next = False
            if word and word[-1] in ".?!":
                capitalize_next = True
            output.append(word)

        return " ".join(output)

# Singleton instance
punctuation_service = PunctuationService()
