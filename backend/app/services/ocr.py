from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

class OCRProvider(ABC):
    @abstractmethod
    def extract_structured_data(self, image_data: str) -> Dict[str, Any]:
        """
        Extracts text from an image and structures it into a dictionary 
        representing the product label.
        """
        pass

class MockOCRProvider(OCRProvider):
    def extract_structured_data(self, image_data: str) -> Dict[str, Any]:
        # In a real app, this would send image_data to an OCR API or Vision-Language Model
        # For Phase 2, we return a mock normalized intermediate representation
        return {
            "name": "Scanned Protein Bar",
            "brand": "ScanFit",
            "serving_size_value": 50,
            "serving_size_unit": "g",
            "serving_description": "1 bar",
            "calories": 200.0,
            "protein": 15.0,
            "carbohydrates": 20.0,
            "total_sugar": 5.0,
            "added_sugar": 2.0,
            "total_fat": 6.0,
            "saturated_fat": 1.0,
            "trans_fat": 0.0,
            "sodium": 100.0,
            "fibre": 5.0,
            "raw_ingredient_text": "Protein Blend (Whey), Peanuts, Cocoa, Sugar",
            "structured_ingredients": [
                {"text": "Protein Blend (Whey)", "is_allergen": True},
                {"text": "Peanuts", "is_allergen": True},
                {"text": "Cocoa", "is_allergen": False},
                {"text": "Sugar", "is_allergen": False}
            ],
            "allergens": ["Milk", "Peanuts"],
            "claims": ["High Protein"],
            "raw_text": "PROTEIN BAR 15G PROTEIN... NUTRITION FACTS..."
        }
