public with sharing class ProductImporterController {

    @AuraEnabled
    public static Map<String, Object> insertProducts(String productsJson) {
        return importProducts(productsJson, null);
    }

    @AuraEnabled
    public static Map<String, Object> insertProductsInBundle(String productsJson, Id bundleId) {
        return importProducts(productsJson, bundleId);
    }

    private static Map<String, Object> importProducts(String productsJson, Id bundleId) {
        Map<String, Object> result = new Map<String, Object>{
            'insertedCount' => 0,
            'errors' => new List<String>()
        };

        List<String> errors = (List<String>) result.get('errors');
        if (String.isBlank(productsJson)) {
            errors.add('Empty payload');
            return result;
        }

        try {
            List<Object> records = (List<Object>) JSON.deserializeUntyped(productsJson);
            if (records == null || records.isEmpty()) {
                errors.add('No product rows found.');
                return result;
            }

            Set<String> incomingCodes = new Set<String>();
            Set<String> incomingCodeCurrencyKeys = new Set<String>();
            Map<String, Integer> fileRowByCompositeKey = new Map<String, Integer>();

            Integer rowIndex = 1;
            for (Object obj : records) {
                Map<String, Object> rec = (Map<String, Object>) obj;
                String code = normalizeText(getStringValue(rec, 'QuoteForce__Product_Code__c', 'Product_Code__c'));
                String currencyCode = normalizeCurrency(getStringValue(rec, 'QuoteForce__Currency__c', 'Currency__c'));
                String compositeKey = buildCompositeKey(code, currencyCode);

                if (String.isBlank((String) rec.get('Name'))) {
                    errors.add('Row ' + rowIndex + ': Name required');
                }
                if (String.isBlank(code)) {
                    errors.add('Row ' + rowIndex + ': QuoteForce__Product_Code__c required');
                }

                if (!String.isBlank(code)) {
                    if (fileRowByCompositeKey.containsKey(compositeKey)) {
                        errors.add('Row ' + rowIndex + ': Duplicate code/currency in file -> ' + compositeKey);
                    } else {
                        fileRowByCompositeKey.put(compositeKey, rowIndex);
                        incomingCodes.add(code);
                        incomingCodeCurrencyKeys.add(compositeKey);
                    }
                }

                rowIndex++;
            }

            if (!errors.isEmpty()) {
                return result;
            }

            for (QuoteForce__Product__c existingProduct : [
                SELECT QuoteForce__Product_Code__c, QuoteForce__Currency__c
                FROM QuoteForce__Product__c
                WHERE QuoteForce__Product_Code__c IN :incomingCodes WITH USER_MODE]) {
                String existingKey = buildCompositeKey(
                    normalizeText(existingProduct.QuoteForce__Product_Code__c),
                    normalizeCurrency(existingProduct.QuoteForce__Currency__c)
                );
                if (incomingCodeCurrencyKeys.contains(existingKey)) {
                    errors.add('Product code/currency already exists -> ' + existingKey);
                }
            }

            if (!errors.isEmpty()) {
                return result;
            }

            List<QuoteForce__Product__c> productsToInsert = new List<QuoteForce__Product__c>();
            for (Object obj : records) {
                Map<String, Object> rec = (Map<String, Object>) obj;

                QuoteForce__Product__c productRecord = new QuoteForce__Product__c();
                productRecord.Name = normalizeText((String) rec.get('Name'));
                productRecord.QuoteForce__Product_Code__c = normalizeText(getStringValue(rec, 'QuoteForce__Product_Code__c', 'Product_Code__c'));
                productRecord.QuoteForce__Description__c = normalizeText(getStringValue(rec, 'QuoteForce__Description__c', 'Description__c'));
                Object defaultPrice = getValue(rec, 'QuoteForce__Default_Price__c', 'Default_Price__c');
                productRecord.QuoteForce__Default_Price__c = defaultPrice != null
                    ? Decimal.valueOf(String.valueOf(defaultPrice))
                    : null;
                Object defaultQuantity = getValue(rec, 'QuoteForce__Default_Quantity__c', 'Default_Quantity__c');
                productRecord.QuoteForce__Default_Quantity__c = defaultQuantity != null
                    ? Integer.valueOf(String.valueOf(defaultQuantity))
                    : null;
                productRecord.QuoteForce__Currency__c = normalizeCurrency(getStringValue(rec, 'QuoteForce__Currency__c', 'Currency__c'));
                Object activeValue = getValue(rec, 'QuoteForce__Active__c', 'Active__c');
                productRecord.QuoteForce__Active__c = activeValue == null
                    ? false
                    : (Boolean) activeValue;

                productsToInsert.add(productRecord);
                
            }

            insert as user productsToInsert;
            
            if (bundleId != null) {
                DeleteImportBundle(bundleId); 
            }

            if (bundleId != null) {
                List<QuoteForce__Product_Line_Items__c> lineItemsToInsert = new List<QuoteForce__Product_Line_Items__c>();
                for (QuoteForce__Product__c insertedProduct : productsToInsert) {
                    QuoteForce__Product_Line_Items__c lineItem = new QuoteForce__Product_Line_Items__c();
                    lineItem.QuoteForce__Product_Bundle__c = bundleId;
                    lineItem.QuoteForce__Product__c = insertedProduct.Id;
                    lineItem.QuoteForce__Quantity__c = insertedProduct.QuoteForce__Default_Quantity__c;
                    lineItem.QuoteForce__Price__c = insertedProduct.QuoteForce__Default_Price__c;
                    lineItem.QuoteForce__Currency__c = insertedProduct.QuoteForce__Currency__c;
                    lineItemsToInsert.add(lineItem);
                }

                if (!lineItemsToInsert.isEmpty()) {
                    insert as user lineItemsToInsert;
                }
            }

            result.put('insertedCount', productsToInsert.size());
            return result;
        } catch (Exception ex) {
            errors.add('Exception: ' + ex.getMessage());
            return result;
        }
    }

    private static String normalizeText(String value) {
        return String.isBlank(value) ? null : value.trim();
    }

    private static Object getValue(Map<String, Object> recordMap, String preferredKey, String fallbackKey) {
        if (recordMap == null) {
            return null;
        }
        return recordMap.containsKey(preferredKey)
            ? recordMap.get(preferredKey)
            : recordMap.get(fallbackKey);
    }

    private static String getStringValue(Map<String, Object> recordMap, String preferredKey, String fallbackKey) {
        Object value = getValue(recordMap, preferredKey, fallbackKey);
        return value == null ? null : String.valueOf(value);
    }

    private static String normalizeCurrency(String value) {
        return String.isBlank(value) ? null : value.trim().toUpperCase();
    }

    private static String buildCompositeKey(String code, String currencyCode) {
        return String.valueOf(code) + '::' + String.valueOf(currencyCode);
    }
      @AuraEnabled
public static void DeleteImportBundle(Id bundleId){
    
    List<QuoteForce__Product_Bundle__c> ProductToDelete = 
        [SELECT Id FROM QuoteForce__Product_Bundle__c WHERE Id = :bundleId WITH USER_MODE];
    
    if(!ProductToDelete.isEmpty()){
        delete as user ProductToDelete;
    }

    }
}