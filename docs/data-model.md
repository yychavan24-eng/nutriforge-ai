# NutriForge Data Models

## Product Model (Conceptual)
```json
{
  "id": "string",
  "barcode": "string",
  "name": "string",
  "brand": "string",
  "category": "string",
  "serving_size": "string",
  "package_quantity": "string",
  "calories": "float",
  "protein": "float",
  "carbohydrates": "float",
  "total_sugar": "float",
  "added_sugar": "float",
  "total_fat": "float",
  "saturated_fat": "float",
  "trans_fat": "float",
  "sodium": "float",
  "fibre": "float",
  "ingredients": ["string"],
  "allergens": ["string"],
  "claims": ["string"],
  "fssai_information": "string",
  "evidence": "string",
  "source": "string",
  "image": "string",
  "last_updated": "datetime"
}
```

## User Profile Model (Conceptual)
```json
{
  "age": "int",
  "height": "float",
  "weight": "float",
  "activityLevel": "enum",
  "goal": "enum",
  "dietaryPreference": "enum",
  "restrictions": ["string"],
  "priorities": ["string"]
}
```
