from datetime import datetime, timedelta

class SrsService:
    @staticmethod
    def calculate_next_review(quality, repetitions, ease_factor, interval):
        """
        SM-2 Algorithm implementation.
        quality: 0-5 (0: complete blackout, 5: perfect response)
        repetitions: number of successful repetitions
        ease_factor: difficulty coefficient (default 2.5)
        interval: current interval in days
        """
        if quality >= 3:
            if repetitions == 0:
                interval = 1
            elif repetitions == 1:
                interval = 6
            else:
                interval = round(interval * ease_factor)
            
            repetitions += 1
            # Ease factor formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
            ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        else:
            repetitions = 0
            interval = 1
            
        if ease_factor < 1.3:
            ease_factor = 1.3
            
        next_review = datetime.utcnow() + timedelta(days=interval)
        
        return {
            'repetitions': repetitions,
            'ease_factor': ease_factor,
            'interval': interval,
            'next_review': next_review
        }

    @staticmethod
    def get_status(interval):
        """Determine status string based on interval."""
        if interval == 0: return 'new'
        if interval < 10: return 'learning'
        if interval < 30: return 'review'
        return 'mastered'
