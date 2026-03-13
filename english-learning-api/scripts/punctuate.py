#!/usr/bin/env python3
"""
Restore punctuation to unpunctuated text.
Uses oliverguhr/fullstop-punctuation-multilang-large model directly via transformers pipeline.
"""
import sys

def main():
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            text = f.read().strip()
    else:
        text = sys.stdin.read().strip()

    if not text:
        print("")
        return

    try:
        from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification

        model_name = "oliverguhr/fullstop-punctuation-multilang-large"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForTokenClassification.from_pretrained(model_name)
        pipe = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="none")

        # Process in chunks to avoid token limit (512 tokens)
        words = text.split()
        chunk_size = 200  # words per chunk
        all_results = []

        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i+chunk_size])
            results = pipe(chunk)

            # Group subtokens into full words, only apply punctuation from the LAST subtoken
            current_word = ""
            current_punct = ""  # track punctuation label for the word

            for r in results:
                token = r["word"]
                label = r["entity"]

                # Handle subword tokens: starts with special char = new word in XLM-Roberta
                if token.startswith("\u2581"):
                    # Flush previous word with its punctuation
                    if current_word:
                        all_results.append(current_word + current_punct)
                    current_word = token[1:]  # remove prefix
                    current_punct = ""
                else:
                    current_word += token

                # Always update punctuation from latest subtoken
                # This means only the LAST subtoken's label will be used
                if label in ("0", "LABEL_0"):
                    current_punct = ""
                elif label in (".", "LABEL_1"):
                    current_punct = "."
                elif label in (",", "LABEL_2"):
                    current_punct = ","
                elif label in ("?", "LABEL_3"):
                    current_punct = "?"
                elif label in ("-", "LABEL_4"):
                    current_punct = "-"
                elif label in (":", "LABEL_5"):
                    current_punct = ":"

            if current_word:
                all_results.append(current_word + current_punct)

        # Capitalize after sentence-ending punctuation
        output = []
        capitalize_next = True
        for word in all_results:
            if capitalize_next and word:
                word = word[0].upper() + word[1:]
                capitalize_next = False
            if word and word[-1] in '.?!':
                capitalize_next = True
            output.append(word)

        print(" ".join(output))

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        print(text)

if __name__ == "__main__":
    main()
