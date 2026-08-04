public with sharing class ProductConfigureController {
    
    public class ProductPricingRequest {
        @AuraEnabled public Id entryId { get; set; }
        @AuraEnabled public Id priceBookId { get; set; }
        @AuraEnabled public Decimal unitPrice { get; set; }
        @AuraEnabled public Boolean isActive { get; set; }
        @AuraEnabled public String currencyCode { get; set; }
        @AuraEnabled public DraftPriceBookRequest draftPriceBook { get; set; }
    }
    
    public class DraftPriceBookRequest {
        @AuraEnabled public String Name { get; set; }
        @AuraEnabled public String description { get; set; }
        @AuraEnabled public String currencyCode { get; set; }
        @AuraEnabled public Boolean isActive { get; set; }
        @AuraEnabled public Boolean isDefault { get; set; }
    }
    
    public class CreateProductWithPricingResult {
        @AuraEnabled public QuoteForce__Product__c productRecord { get; set; }
        @AuraEnabled public List<QuoteForce__Price_Book__c> createdPriceBooks { get; set; }
        @AuraEnabled public List<QuoteForce__Price_Book_Entry__c> createdEntries { get; set; }
    }

    public class ChildRecordCheckResult {
        @AuraEnabled public Boolean hasChild { get; set; }
        @AuraEnabled public Boolean hasPriceBookEntries { get; set; }
        @AuraEnabled public Boolean hasBundleLineItems { get; set; }
    }
    
    
    @AuraEnabled
    public static QuoteForce__Product__c insertProduct(
        QuoteForce__Product__c prod_Obj
    ) {
        List<QuoteForce__Product__c> existingProducts = [
            SELECT Id
            FROM QuoteForce__Product__c
            WHERE QuoteForce__Product_Code__c =
            :prod_Obj.QuoteForce__Product_Code__c
            AND QuoteForce__Currency__c =
            :prod_Obj.QuoteForce__Currency__c
            LIMIT 1
        ];
        
        if (!existingProducts.isEmpty()) {
            AuraHandledException dupEx = new AuraHandledException(
                'Product with same code and currency already exists'
            );
            dupEx.setMessage('Product with same code and currency already exists');
            throw dupEx;
        }
        
        try {
            insert prod_Obj;
            return prod_Obj;
            
        } catch (DmlException ex) {
            String errorMessage = ex.getDmlMessage(0);
            System.debug(
                'Product Insert Error => ' + errorMessage
            );
            AuraHandledException dmlEx = new AuraHandledException(errorMessage);
            dmlEx.setMessage(errorMessage);
            throw dmlEx;
        }
    }
    
    @AuraEnabled
    public static QuoteForce__Product__c selectedUpdateProduct(QuoteForce__Product__c prod_Obj) {
        return updateProduct(prod_Obj);
    }
    
    @AuraEnabled
    public static QuoteForce__Product_Bundle__c insertProductBundle(QuoteForce__Product_Bundle__c prod_Bundle_Obj) {
        try {
            if (prod_Bundle_Obj == null || String.isBlank(prod_Bundle_Obj.Name)) {
                throw new AuraHandledException('Product Bundle name is required');
            }
            
            if (String.isNotBlank(prod_Bundle_Obj.QuoteForce__Currency__c)) {
                prod_Bundle_Obj.QuoteForce__Currency__c = prod_Bundle_Obj.QuoteForce__Currency__c.trim().toUpperCase();
            }
            
            insert as user prod_Bundle_Obj;
            return prod_Bundle_Obj;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static QuoteForce__Product_Bundle__c updateProductBundle(QuoteForce__Product_Bundle__c prod_Bundle_Obj) {
        try {
            if (prod_Bundle_Obj == null || prod_Bundle_Obj.Id == null) {
                throw new AuraHandledException('Product Bundle is required');
            }
            
            update as user prod_Bundle_Obj;
            return [
                SELECT Id, Name, QuoteForce__Description__c, QuoteForce__Currency__c, QuoteForce__Price_Book__c, QuoteForce__Price_Book__r.Name
                FROM QuoteForce__Product_Bundle__c
                WHERE Id = :prod_Bundle_Obj.Id WITH USER_MODE
                LIMIT 1
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static List<QuoteForce__Product_Line_Items__c> insertProductLineItm(list<QuoteForce__Product_Line_Items__c> prod_itm_Lst) {
        try {
            syncPriceBookEntries(prod_itm_Lst);
            insert as user prod_itm_Lst;
            return prod_itm_Lst;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static QuoteForce__Product_Line_Items__c insertProductLineItmSingle(QuoteForce__Product_Line_Items__c plObj) {
        try {
            syncPriceBookEntries(new List<QuoteForce__Product_Line_Items__c>{ plObj });
            insert as user plObj;
            return plObj;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static List<QuoteForce__Product_Line_Items__c> GetProductLineItm(string Id) {
        try {
            List<QuoteForce__Product_Line_Items__c> prod_itm_Lst = [
                SELECT Id, QuoteForce__Product_Bundle__c, QuoteForce__Product_Bundle__r.QuoteForce__Price_Book__c, QuoteForce__Quantity__c, QuoteForce__Currency__c, QuoteForce__Product__c,
                QuoteForce__Product__r.Name, QuoteForce__Product__r.QuoteForce__Product_Code__c, QuoteForce__Price__c, QuoteForce__Price_Book_Entry__c,
                QuoteForce__Price_Book_Entry__r.Name, QuoteForce__Price_Book_Entry__r.QuoteForce__Unit_Price__c,
                QuoteForce__Price_Book_Entry__r.QuoteForce__Product__c, QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.Name,
                QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.QuoteForce__Product_Code__c
                FROM QuoteForce__Product_Line_Items__c
                Where QuoteForce__Product_Bundle__c = :Id WITH USER_MODE
                ORDER BY CreatedDate ASC, Id ASC
            ];
            return prod_itm_Lst;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    
    @AuraEnabled
    public static QuoteForce__Product__c updateProduct(QuoteForce__Product__c prod_Obj) {
        
        if (String.isBlank(prod_Obj.QuoteForce__Product_Code__c)) {
            throw new AuraHandledException('Product Code is required');
        }
        
        List<QuoteForce__Product__c> existingProducts = [
            SELECT Id 
            FROM QuoteForce__Product__c 
            WHERE QuoteForce__Product_Code__c = :prod_Obj.QuoteForce__Product_Code__c
            AND QuoteForce__Currency__c = :prod_Obj.QuoteForce__Currency__c
            AND Id != :prod_Obj.Id WITH USER_MODE
            LIMIT 1
        ];
        
        if (!existingProducts.isEmpty()) {
            throw new AuraHandledException('Product with same code and currency already exists');
        }
        
        update as user prod_Obj;
        return prod_Obj;
    }
    
    
    @AuraEnabled
    public static QuoteForce__Product_Line_Items__c updateProductLineItems(QuoteForce__Product_Line_Items__c plitem_Obj) {
        try {
            syncPriceBookEntries(new List<QuoteForce__Product_Line_Items__c>{ plitem_Obj });
            update as user plitem_Obj;
            return plitem_Obj;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    
    
    
    @AuraEnabled
    public static List<QuoteForce__Product__c> GetProducts(String searchKey, String currencyFilter) {
        try {
            System.debug('### Apex GetProducts: searchKey="' + searchKey + '", currencyFilter="' + currencyFilter + '"');
            
            String searchTerm = '%' + String.escapeSingleQuotes(searchKey) + '%';
            Set<Id> productIdsWithPBE = new Set<Id>();
            
            // 1. Fetch IDs of products that have an active Price Book Entry in the selected currency
            if (String.isNotBlank(currencyFilter)) {
                List<QuoteForce__Price_Book_Entry__c> activeEntries = [
                    SELECT QuoteForce__Product__c 
                    FROM QuoteForce__Price_Book_Entry__c 
                    WHERE QuoteForce__Currency__c = :currencyFilter 
                    AND QuoteForce__Is_Active__c = true 
                    WITH USER_MODE
                ];
                for (QuoteForce__Price_Book_Entry__c entry : activeEntries) {
                    if (entry.QuoteForce__Product__c != null) {
                        productIdsWithPBE.add(entry.QuoteForce__Product__c);
                    }
                }
            }
            
            // 2. Build the main query
            String query = 'SELECT Id, Name, QuoteForce__Product_Code__c, QuoteForce__Currency__c, ' +
                'QuoteForce__ContentDocumentLink_Id__c, QuoteForce__Description__c, ' +
                'QuoteForce__Default_Price__c, QuoteForce__Default_Quantity__c, ' +
                'QuoteForce__Active__c ' +
                'FROM QuoteForce__Product__c ' +
                'WHERE Name LIKE :searchTerm';
            
            if (String.isNotBlank(currencyFilter)) {
                // Using the pre-queried Set of IDs (productIdsWithPBE) inside the OR is fully supported by SOQL
                query += ' AND (QuoteForce__Currency__c = :currencyFilter OR Id IN :productIdsWithPBE)';
            }
            
            query += ' ORDER BY CreatedDate DESC';
            System.debug('### Apex GetProducts Query: ' + query);
            
            // 3. Create the binds map
            Map<String, Object> binds = new Map<String, Object>{
                'searchTerm' => searchTerm,
                    'currencyFilter' => currencyFilter,
                    'productIdsWithPBE' => productIdsWithPBE
                    };
                        
                        List<QuoteForce__Product__c> results = Database.queryWithBinds(
                            query, 
                            binds, 
                            AccessLevel.USER_MODE
                        );
            
            System.debug('### Apex GetProducts result count: ' + results.size());
            return results;
            
        } catch (Exception e) {
            System.debug('### Apex GetProducts ERROR: ' + e.getMessage() + '\n' + e.getStackTraceString());
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static ChildRecordCheckResult hasChildRecords(Id parentId) {
        ChildRecordCheckResult result = new ChildRecordCheckResult();

        Integer priceBookEntryCount = [
            SELECT COUNT() FROM QuoteForce__Price_Book_Entry__c 
            WHERE QuoteForce__Product__c = :parentId WITH USER_MODE
        ];
        Integer bundleLineItemCount = [
            SELECT COUNT() FROM QuoteForce__Product_Line_Items__c 
            WHERE QuoteForce__Product__c = :parentId WITH USER_MODE
        ];

        result.hasPriceBookEntries = priceBookEntryCount > 0;
        result.hasBundleLineItems = bundleLineItemCount > 0;
        result.hasChild = result.hasPriceBookEntries || result.hasBundleLineItems;

        return result;
    }
    
    @AuraEnabled
    public static string deleteProduct(String Id) {
        try {
            Integer bundleLineItemCount = [
                SELECT COUNT() FROM QuoteForce__Product_Line_Items__c 
                WHERE QuoteForce__Product__c = :Id WITH USER_MODE
            ];
            if (bundleLineItemCount > 0) {
                throw new AuraHandledException('This product is used in a Product Bundle. Please remove it from the bundle first.');
            }

            // Price Book Entries no longer block — cascade delete them, then the product.
            List<QuoteForce__Price_Book_Entry__c> entriesToDelete = [
                SELECT Id FROM QuoteForce__Price_Book_Entry__c 
                WHERE QuoteForce__Product__c = :Id WITH USER_MODE
            ];
            if (!entriesToDelete.isEmpty()) {
                delete as user entriesToDelete;
            }

            delete as user [Select Id From QuoteForce__Product__c WHERE Id =: Id WITH USER_MODE];
            return 'Success';
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static string deleteProductBundle(String Id) {
        try {
            List<QuoteForce__Product_Line_Items__c> prod_itm_Lst = [SELECT Id, QuoteForce__Product_Bundle__c, QuoteForce__Quantity__c, QuoteForce__Product__c, QuoteForce__Price__c FROM QuoteForce__Product_Line_Items__c Where QuoteForce__Product_Bundle__c =: Id WITH USER_MODE];
            List<QuoteForce__Product_Bundle__c> productBundleList = [SELECT Id FROM QuoteForce__Product_Bundle__c Where Id =: Id WITH USER_MODE LIMIT 1 ];
            delete as user prod_itm_Lst;
            delete as user productBundleList;
            return 'Success';
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static boolean deleteProductLineItems(String Id) {
        try {
            delete as user [Select Id  From QuoteForce__Product_Line_Items__c WHERE Id =: Id WITH USER_MODE];
            
            return true;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        
    }
    
    public class ProductBundleWrapper {
        @AuraEnabled public Id bundleId { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String description { get; set; }
        @AuraEnabled public String currencyCode { get; set; }
        @AuraEnabled public Id priceBookId { get; set; }
        @AuraEnabled public String priceBookName { get; set; }
        @AuraEnabled public boolean selected { get; set; }
        
        public ProductBundleWrapper(QuoteForce__Product_Bundle__c productBundle) {
            this.bundleId = productBundle.Id;
            this.name = productBundle.Name;
            this.description = productBundle.QuoteForce__Description__c;
            this.currencyCode = productBundle.QuoteForce__Currency__c;
            this.priceBookId = productBundle.QuoteForce__Price_Book__c;
            this.priceBookName = productBundle.QuoteForce__Price_Book__r != null ? productBundle.QuoteForce__Price_Book__r.Name : null;
            this.selected = false;
        }
    }
    
    @AuraEnabled
    public static List<ProductBundleWrapper> GetProductsBundle(String searchKey, String currencyFilter) {
        try {
            
            String searchTerm = '%' + (searchKey != null ? searchKey : '') + '%';
            
            List<QuoteForce__Product_Bundle__c> productBundleList;
            
            if(String.isNotBlank(currencyFilter) && String.isNotBlank(searchKey)){
                
                productBundleList = [
                    SELECT Id, Name, QuoteForce__Description__c, QuoteForce__Currency__c, QuoteForce__Price_Book__c, QuoteForce__Price_Book__r.Name
                    FROM QuoteForce__Product_Bundle__c
                    WHERE Name LIKE :searchTerm
                    AND QuoteForce__Currency__c = :currencyFilter WITH USER_MODE 
                    ORDER BY CreatedDate DESC 
                ];
                
            }else if(String.isNotBlank(currencyFilter)){
                
                productBundleList = [
                    SELECT Id, Name, QuoteForce__Description__c, QuoteForce__Currency__c, QuoteForce__Price_Book__c, QuoteForce__Price_Book__r.Name
                    FROM QuoteForce__Product_Bundle__c
                    WHERE QuoteForce__Currency__c = :currencyFilter WITH USER_MODE
                    ORDER BY CreatedDate DESC
                ];
                
            }else if(String.isNotBlank(searchKey)){
                
                productBundleList = [
                    SELECT Id, Name, QuoteForce__Description__c, QuoteForce__Currency__c, QuoteForce__Price_Book__c, QuoteForce__Price_Book__r.Name
                    FROM QuoteForce__Product_Bundle__c
                    WHERE Name LIKE :searchTerm WITH USER_MODE
                    ORDER BY CreatedDate DESC
                ];
                
            }else{
                
                productBundleList = [
                    SELECT Id, Name, QuoteForce__Description__c, QuoteForce__Currency__c, QuoteForce__Price_Book__c, QuoteForce__Price_Book__r.Name
                    FROM QuoteForce__Product_Bundle__c WITH USER_MODE
                    ORDER BY CreatedDate DESC
                    LIMIT 200
                ];
            }
            
            List<ProductBundleWrapper> wrappedBundles = new List<ProductBundleWrapper>();
            
            for(QuoteForce__Product_Bundle__c bundle : productBundleList){
                wrappedBundles.add(new ProductBundleWrapper(bundle));
            }
            
            return wrappedBundles;
            
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static Id uploadFile(String base64, String filename, Id recordId) {
        if (String.isBlank(base64) || String.isBlank(filename) || String.isBlank(recordId)) {
            throw new AuraHandledException('Invalid file upload parameters.');
        }
        
        // Decode base64
        Blob fileBody;
        try {
            fileBody = EncodingUtil.base64Decode(base64);
        } catch (Exception e) {
            throw new AuraHandledException('File decoding failed.');
        }
        
        // Create ContentVersion
        ContentVersion cv = new ContentVersion();
        cv.Title = filename;
        cv.PathOnClient = filename;
        cv.VersionData = fileBody;
        insert as user cv;
        
        // Get ContentDocumentId
        cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id WITH USER_MODE LIMIT 1];
        
        // Link to Product2
        ContentDocumentLink cdl = new ContentDocumentLink();
        cdl.ContentDocumentId = cv.ContentDocumentId;
        cdl.LinkedEntityId = recordId;
        cdl.ShareType = 'V';
        cdl.Visibility = 'AllUsers';
        insert as user cdl;
        
        // update as user Product2 custom field
        QuoteForce__Product__c prod = [SELECT Id FROM QuoteForce__Product__c WHERE Id = :recordId WITH USER_MODE LIMIT 1];
        prod.QuoteForce__ContentDocumentLink_Id__c = cv.Id;
        update as user prod;
        
        return cv.ContentDocumentId;
    }
    
    @AuraEnabled(cacheable=false)
    public static void deleteFile(Id recordId) {
        if (String.isBlank(recordId)) {
            throw new AuraHandledException('Invalid Product Id.');
        }
        
        // Fetch the ContentDocumentLink(s)
        List<ContentDocumentLink> links = [
            SELECT Id, ContentDocumentId 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId = :recordId WITH USER_MODE];
        
        if (!links.isEmpty()) {
            // Collect all unique ContentDocument Ids
            Set<Id> contentDocIds = new Set<Id>();
            for (ContentDocumentLink link : links) {
                contentDocIds.add(link.ContentDocumentId);
            }
            
            // delete as user the links first
            delete as user links;
            
            // Now delete as user the ContentDocuments (this auto-deletes ContentVersions)
            List<ContentDocument> docsToDelete = [
                SELECT Id FROM ContentDocument WHERE Id IN :contentDocIds WITH USER_MODE];
            delete as user docsToDelete;
            
            // Clear the reference from Product2
            QuoteForce__Product__c prod = [SELECT Id, QuoteForce__ContentDocumentLink_Id__c FROM QuoteForce__Product__c WHERE Id = :recordId WITH USER_MODE LIMIT 1];
            prod.QuoteForce__ContentDocumentLink_Id__c = null;
            update as user prod;
        }
    }
    
    
    @AuraEnabled(cacheable=false)
    public static Id uploadFileToProduct(Id productId, String base64Data, String fileName) {
        if (String.isBlank(productId) || String.isBlank(base64Data) || String.isBlank(fileName)) {
            throw new AuraHandledException('Missing required parameters.');
        }
        
        // Step 1: Upload ContentVersion
        ContentVersion version = new ContentVersion();
        version.Title = fileName;
        version.PathOnClient = fileName;
        version.VersionData = EncodingUtil.base64Decode(base64Data);
        insert as user version;
        
        // Step 2: Query ContentDocument Id
        ContentVersion insertedVersion = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :version.Id WITH USER_MODE LIMIT 1];
        
        // Step 3: Create ContentDocumentLink to Product
        ContentDocumentLink link = new ContentDocumentLink();
        link.ContentDocumentId = insertedVersion.ContentDocumentId;
        link.LinkedEntityId = productId;
        link.ShareType = 'V';
        link.Visibility = 'AllUsers';
        insert as user link;
        
        // Step 4: update as user custom field in Product2 (optional)
        QuoteForce__Product__c prod = [SELECT Id FROM QuoteForce__Product__c WHERE Id = :productId WITH USER_MODE LIMIT 1];
        prod.QuoteForce__ContentDocumentLink_Id__c = insertedVersion.Id;
        update as user prod;
        
        return prod.QuoteForce__ContentDocumentLink_Id__c;
    }
    
    @AuraEnabled(cacheable=false)
    public static CreateProductWithPricingResult createProductWithPricing(
        QuoteForce__Product__c prod_Obj,
        List<ProductPricingRequest> pricingRows
    ) {
        try {
            validateUnifiedProductCreate(prod_Obj, pricingRows, null);
            
            Map<Id, QuoteForce__Price_Book__c> existingPriceBooksById = new Map<Id, QuoteForce__Price_Book__c>();
            Set<Id> existingPriceBookIds = new Set<Id>();
            Set<String> draftPriceBookNames = new Set<String>();
            Set<String> draftPriceBookNamesForQuery = new Set<String>();
            Set<String> rowDuplicateKeys = new Set<String>();
            Integer defaultDraftCount = 0;
            
            for (ProductPricingRequest pricingRow : pricingRows) {
                if (pricingRow.priceBookId != null) {
                    existingPriceBookIds.add(pricingRow.priceBookId);
                } else if (pricingRow.draftPriceBook != null) {
                    if (String.isNotBlank(pricingRow.draftPriceBook.Name)) {
                        String trimmedDraftName = pricingRow.draftPriceBook.Name.trim();
                        String normalizedDraftName = trimmedDraftName.toLowerCase();
                        draftPriceBookNames.add(normalizedDraftName);
                        draftPriceBookNamesForQuery.add(trimmedDraftName);
                    }
                    if (pricingRow.draftPriceBook.isDefault == true) {
                        defaultDraftCount++;
                    }
                }
            }
            
            if (!existingPriceBookIds.isEmpty()) {
                existingPriceBooksById = new Map<Id, QuoteForce__Price_Book__c>([
                    SELECT Id, Name, QuoteForce__Currency__c, QuoteForce__Description__c, QuoteForce__Is_Active__c, QuoteForce__Is_Default__c
                    FROM QuoteForce__Price_Book__c
                    WHERE Id IN :existingPriceBookIds WITH USER_MODE]);
            }
            
            Map<String, QuoteForce__Price_Book__c> existingPriceBooksByNormalizedName = new Map<String, QuoteForce__Price_Book__c>();
            if (!draftPriceBookNames.isEmpty()) {
                for (QuoteForce__Price_Book__c existingPriceBook : [
                    SELECT Id, Name, QuoteForce__Currency__c, QuoteForce__Description__c, QuoteForce__Is_Active__c, QuoteForce__Is_Default__c
                    FROM QuoteForce__Price_Book__c
                    WHERE Name IN :draftPriceBookNamesForQuery WITH USER_MODE]) {
                        existingPriceBooksByNormalizedName.put(existingPriceBook.Name.toLowerCase(), existingPriceBook);
                    }
            }
            
            if (defaultDraftCount > 1) {
                throw new AuraHandledException('Only one draft Price Book can be marked as default.');
            }
            
            for (ProductPricingRequest pricingRow : pricingRows) {
                validatePricingRow(
                    pricingRow,
                    existingPriceBooksById,
                    existingPriceBooksByNormalizedName,
                    rowDuplicateKeys
                );
            }
            
            insert as user prod_Obj;
            
            Map<String, Id> createdPriceBookIdsByName = new Map<String, Id>();
            List<QuoteForce__Price_Book__c> priceBooksToInsert = new List<QuoteForce__Price_Book__c>();
            List<QuoteForce__Price_Book__c> createdPriceBooks = new List<QuoteForce__Price_Book__c>();
            
            for (ProductPricingRequest pricingRow : pricingRows) {
                if (pricingRow.priceBookId != null || pricingRow.draftPriceBook == null) {
                    continue;
                }
                
                String normalizedDraftName = pricingRow.draftPriceBook.Name.trim().toLowerCase();
                if (createdPriceBookIdsByName.containsKey(normalizedDraftName)) {
                    continue;
                }
                
                priceBooksToInsert.add(new QuoteForce__Price_Book__c(
                    Name = pricingRow.draftPriceBook.Name.trim(),
                    QuoteForce__Description__c = pricingRow.draftPriceBook.description,
                    QuoteForce__Currency__c = normalizeCurrencyCode(pricingRow.draftPriceBook.currencyCode),
                    QuoteForce__Is_Active__c = pricingRow.draftPriceBook.isActive != false,
                    QuoteForce__Is_Default__c = pricingRow.draftPriceBook.isDefault == true
                ));
            }
            
            if (!priceBooksToInsert.isEmpty()) {
                insert as user priceBooksToInsert;
                createdPriceBooks.addAll(priceBooksToInsert);
                
                String defaultCurrencyCode;
                Id currentPriceBookId;
                
                for (QuoteForce__Price_Book__c createdPriceBook : priceBooksToInsert) {
                    
                    createdPriceBookIdsByName.put(
                        createdPriceBook.Name.toLowerCase(),
                        createdPriceBook.Id
                    );
                    
                    if (createdPriceBook.QuoteForce__Is_Default__c == true) {
                        defaultCurrencyCode = createdPriceBook.QuoteForce__Currency__c;
                        currentPriceBookId = createdPriceBook.Id;
                    }
                }
                
                if (currentPriceBookId != null) {
                    clearOtherDefaultPriceBooks(defaultCurrencyCode, currentPriceBookId);
                }
            }
            
            List<QuoteForce__Price_Book_Entry__c> entriesToInsert = new List<QuoteForce__Price_Book_Entry__c>();
            for (ProductPricingRequest pricingRow : pricingRows) {
                Id priceBookId = pricingRow.priceBookId;
                String entryCurrency = normalizeCurrencyCode(pricingRow.currencyCode);
                
                if (priceBookId == null && pricingRow.draftPriceBook != null) {
                    String normalizedDraftName = pricingRow.draftPriceBook.Name.trim().toLowerCase();
                    priceBookId = createdPriceBookIdsByName.get(normalizedDraftName);
                    entryCurrency = normalizeCurrencyCode(pricingRow.draftPriceBook.currencyCode);
                } else if (priceBookId != null && existingPriceBooksById.containsKey(priceBookId)) {
                    entryCurrency = normalizeCurrencyCode(existingPriceBooksById.get(priceBookId).QuoteForce__Currency__c);
                }
                
                entriesToInsert.add(new QuoteForce__Price_Book_Entry__c(
                    QuoteForce__Price_Book__c = priceBookId,
                    QuoteForce__Product__c = prod_Obj.Id,
                    QuoteForce__Product_Code__c = prod_Obj.QuoteForce__Product_Code__c,
                    QuoteForce__Currency__c = String.isNotBlank(entryCurrency)
                    ? entryCurrency
                    : normalizeCurrencyCode(prod_Obj.QuoteForce__Currency__c),
                    QuoteForce__Unit_Price__c = pricingRow.unitPrice,
                    QuoteForce__Is_Active__c = pricingRow.isActive != false
                ));
            }
            
            insert as user entriesToInsert;
            
            CreateProductWithPricingResult response = new CreateProductWithPricingResult();
            response.productRecord = prod_Obj;
            response.createdPriceBooks = createdPriceBooks;
            response.createdEntries = entriesToInsert;
            return response;
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static CreateProductWithPricingResult updateProductWithPricing(
        QuoteForce__Product__c prod_Obj,
        List<ProductPricingRequest> pricingRows
    ) {
        try {
            if (prod_Obj == null || prod_Obj.Id == null) {
                throw new AuraHandledException('Product Id is required.');
            }
            
            validateUnifiedProductCreate(prod_Obj, pricingRows, prod_Obj.Id);
            
            Map<Id, QuoteForce__Price_Book_Entry__c> existingEntriesById = new Map<Id, QuoteForce__Price_Book_Entry__c>([
                SELECT Id, QuoteForce__Price_Book__c, QuoteForce__Product__c
                FROM QuoteForce__Price_Book_Entry__c
                WHERE QuoteForce__Product__c = :prod_Obj.Id WITH USER_MODE]);
            
            Map<Id, QuoteForce__Price_Book__c> existingPriceBooksById = new Map<Id, QuoteForce__Price_Book__c>();
            Set<Id> existingPriceBookIds = new Set<Id>();
            Set<String> draftPriceBookNamesForQuery = new Set<String>();
            Set<String> rowDuplicateKeys = new Set<String>();
            Integer defaultDraftCount = 0;
            
            for (ProductPricingRequest pricingRow : pricingRows) {
                if (pricingRow.priceBookId != null) {
                    existingPriceBookIds.add(pricingRow.priceBookId);
                } else if (pricingRow.draftPriceBook != null) {
                    if (String.isNotBlank(pricingRow.draftPriceBook.Name)) {
                        draftPriceBookNamesForQuery.add(pricingRow.draftPriceBook.Name.trim());
                    }
                    if (pricingRow.draftPriceBook.isDefault == true) {
                        defaultDraftCount++;
                    }
                }
                
                if (pricingRow.entryId != null && !existingEntriesById.containsKey(pricingRow.entryId)) {
                    throw new AuraHandledException('One or more Price Book Entries are invalid for this product.');
                }
            }
            
            if (!existingPriceBookIds.isEmpty()) {
                existingPriceBooksById = new Map<Id, QuoteForce__Price_Book__c>([
                    SELECT Id, Name, QuoteForce__Currency__c, QuoteForce__Description__c, QuoteForce__Is_Active__c, QuoteForce__Is_Default__c
                    FROM QuoteForce__Price_Book__c
                    WHERE Id IN :existingPriceBookIds WITH USER_MODE]);
            }
            
            Map<String, QuoteForce__Price_Book__c> existingPriceBooksByNormalizedName = new Map<String, QuoteForce__Price_Book__c>();
            if (!draftPriceBookNamesForQuery.isEmpty()) {
                for (QuoteForce__Price_Book__c existingPriceBook : [
                    SELECT Id, Name, QuoteForce__Currency__c, QuoteForce__Description__c, QuoteForce__Is_Active__c, QuoteForce__Is_Default__c
                    FROM QuoteForce__Price_Book__c
                    WHERE Name IN :draftPriceBookNamesForQuery WITH USER_MODE]) {
                        existingPriceBooksByNormalizedName.put(existingPriceBook.Name.toLowerCase(), existingPriceBook);
                    }
            }
            
            if (defaultDraftCount > 1) {
                throw new AuraHandledException('Only one draft Price Book can be marked as default.');
            }
            
            for (ProductPricingRequest pricingRow : pricingRows) {
                validatePricingRow(
                    pricingRow,
                    existingPriceBooksById,
                    existingPriceBooksByNormalizedName,
                    rowDuplicateKeys
                );
            }
            
            update as user prod_Obj;
            
            Map<String, Id> createdPriceBookIdsByName = new Map<String, Id>();
            List<QuoteForce__Price_Book__c> priceBooksToInsert = new List<QuoteForce__Price_Book__c>();
            List<QuoteForce__Price_Book__c> createdPriceBooks = new List<QuoteForce__Price_Book__c>();
            
            for (ProductPricingRequest pricingRow : pricingRows) {
                if (pricingRow.priceBookId != null || pricingRow.draftPriceBook == null) {
                    continue;
                }
                
                String normalizedDraftName = pricingRow.draftPriceBook.Name.trim().toLowerCase();
                if (createdPriceBookIdsByName.containsKey(normalizedDraftName)) {
                    continue;
                }
                
                priceBooksToInsert.add(new QuoteForce__Price_Book__c(
                    Name = pricingRow.draftPriceBook.Name.trim(),
                    QuoteForce__Description__c = pricingRow.draftPriceBook.description,
                    QuoteForce__Currency__c = normalizeCurrencyCode(pricingRow.draftPriceBook.currencyCode),
                    QuoteForce__Is_Active__c = pricingRow.draftPriceBook.isActive != false,
                    QuoteForce__Is_Default__c = pricingRow.draftPriceBook.isDefault == true
                ));
            }
            
            if (!priceBooksToInsert.isEmpty()) {
                insert as user priceBooksToInsert;
                createdPriceBooks.addAll(priceBooksToInsert);
                
                String defaultCurrencyCode;
                Id defaultPriceBookId;
                
                for (QuoteForce__Price_Book__c createdPriceBook : priceBooksToInsert) {
                    
                    createdPriceBookIdsByName.put(
                        createdPriceBook.Name.toLowerCase(),
                        createdPriceBook.Id
                    );
                    
                    if (createdPriceBook.QuoteForce__Is_Default__c == true) {
                        defaultCurrencyCode = createdPriceBook.QuoteForce__Currency__c; 
                        defaultPriceBookId = createdPriceBook.Id;
                    }
                }
                
                if (defaultPriceBookId != null) {
                    clearOtherDefaultPriceBooks(defaultCurrencyCode, defaultPriceBookId); 
                }
            }
            Set<Id> retainedEntryIds = new Set<Id>();
            List<QuoteForce__Price_Book_Entry__c> entriesToInsert = new List<QuoteForce__Price_Book_Entry__c>();
            List<QuoteForce__Price_Book_Entry__c> entriesToUpdate = new List<QuoteForce__Price_Book_Entry__c>();
            
            for (ProductPricingRequest pricingRow : pricingRows) {
                Id priceBookId = pricingRow.priceBookId;
                String entryCurrency = normalizeCurrencyCode(pricingRow.currencyCode);
                
                if (priceBookId == null && pricingRow.draftPriceBook != null) {
                    String normalizedDraftName = pricingRow.draftPriceBook.Name.trim().toLowerCase();
                    priceBookId = createdPriceBookIdsByName.get(normalizedDraftName);
                    entryCurrency = normalizeCurrencyCode(pricingRow.draftPriceBook.currencyCode);
                } else if (priceBookId != null && existingPriceBooksById.containsKey(priceBookId)) {
                    entryCurrency = normalizeCurrencyCode(existingPriceBooksById.get(priceBookId).QuoteForce__Currency__c);
                }
                
                QuoteForce__Price_Book_Entry__c workingEntry = pricingRow.entryId != null
                    ? new QuoteForce__Price_Book_Entry__c(Id = pricingRow.entryId)
                    : new QuoteForce__Price_Book_Entry__c();
                
                workingEntry.QuoteForce__Price_Book__c = priceBookId;
                workingEntry.QuoteForce__Product__c = prod_Obj.Id;
                workingEntry.QuoteForce__Product_Code__c = prod_Obj.QuoteForce__Product_Code__c;
                workingEntry.QuoteForce__Currency__c = String.isNotBlank(entryCurrency)
                    ? entryCurrency
                    : normalizeCurrencyCode(prod_Obj.QuoteForce__Currency__c);
                workingEntry.QuoteForce__Unit_Price__c = pricingRow.unitPrice;
                workingEntry.QuoteForce__Is_Active__c = pricingRow.isActive != false;
                
                if (pricingRow.entryId != null) {
                    retainedEntryIds.add(pricingRow.entryId);
                    entriesToUpdate.add(workingEntry);
                } else {
                    entriesToInsert.add(workingEntry);
                }
            }
            
            if (!entriesToInsert.isEmpty()) {
                insert as user entriesToInsert;
            }
            if (!entriesToUpdate.isEmpty()) {
                update as user entriesToUpdate;
            }
            
            List<QuoteForce__Price_Book_Entry__c> entriesToDelete = new List<QuoteForce__Price_Book_Entry__c>();
            for (QuoteForce__Price_Book_Entry__c existingEntry : existingEntriesById.values()) {
                if (!retainedEntryIds.contains(existingEntry.Id)) {
                    entriesToDelete.add(new QuoteForce__Price_Book_Entry__c(Id = existingEntry.Id));
                }
            }
            if (!entriesToDelete.isEmpty()) {
                delete as user entriesToDelete;
            }
            
            CreateProductWithPricingResult response = new CreateProductWithPricingResult();
            response.productRecord = prod_Obj;
            response.createdPriceBooks = createdPriceBooks;
            response.createdEntries = [
                SELECT Id, Name, QuoteForce__Price_Book__c, QuoteForce__Price_Book__r.Name, QuoteForce__Product__c, QuoteForce__Product__r.Name, QuoteForce__Product__r.QuoteForce__Product_Code__c,
                QuoteForce__Product_Code__c, QuoteForce__Currency__c, QuoteForce__Unit_Price__c, QuoteForce__Is_Active__c
                FROM QuoteForce__Price_Book_Entry__c
                WHERE QuoteForce__Product__c = :prod_Obj.Id WITH USER_MODE
                ORDER BY CreatedDate ASC
            ];
            return response;
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static List<QuoteForce__Price_Book__c> listPriceBooks(String searchKey, String currencyFilter, Boolean activeOnly) {
        try {
            String searchTerm = '%' + String.escapeSingleQuotes(String.isBlank(searchKey) ? '' : searchKey.trim()) + '%';
            
            String query =
                'SELECT Id, Name, QuoteForce__Currency__c, QuoteForce__Description__c, QuoteForce__Is_Active__c, QuoteForce__Is_Default__c, CreatedDate ' +
                'FROM QuoteForce__Price_Book__c WHERE Name LIKE :searchTerm';
            
            if (String.isNotBlank(currencyFilter)) {
                query += ' AND QuoteForce__Currency__c = :currencyFilter';
            }
            if (activeOnly == true) {
                query += ' AND QuoteForce__Is_Active__c = true';
            }
            
            query += ' ORDER BY QuoteForce__Is_Default__c DESC, Name ASC';
            return Database.queryWithBinds(query, new Map<String, Object>{ 'searchTerm' => searchTerm, 'currencyFilter' => currencyFilter }, AccessLevel.USER_MODE);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static QuoteForce__Price_Book__c upsertPriceBook(QuoteForce__Price_Book__c priceBookRecord) {
        try {
            if (priceBookRecord == null) {
                throw new AuraHandledException('Price Book data is required.');
            }
            if (String.isBlank(priceBookRecord.Name)) {
                throw new AuraHandledException('Price Book name is required.');
            }

            /*if (priceBookRecord.QuoteForce__Is_Default__c == true && priceBookRecord.QuoteForce__Is_Active__c != true) {
                throw new AuraHandledException('Default Price Book must be active.');
            }*/
            
            upsert as user priceBookRecord;
            
          /*  if (priceBookRecord.QuoteForce__Is_Default__c == true) {
                clearOtherDefaultPriceBooks(priceBookRecord.QuoteForce__Currency__c, priceBookRecord.Id);
            }
            */
            return [
                SELECT Id, Name, QuoteForce__Currency__c, QuoteForce__Description__c, QuoteForce__Is_Active__c, QuoteForce__Is_Default__c
                FROM QuoteForce__Price_Book__c
                WHERE Id = :priceBookRecord.Id WITH USER_MODE
                LIMIT 1
            ];
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static Boolean deletePriceBook(Id priceBookId) {
        try {
            if (priceBookId == null) {
                throw new AuraHandledException('Price Book Id is required.');
            }
            
            List<QuoteForce__Price_Book_Entry__c> entriesToDelete = [
                SELECT Id
                FROM QuoteForce__Price_Book_Entry__c
                WHERE QuoteForce__Price_Book__c = :priceBookId WITH USER_MODE];
            
            if (!entriesToDelete.isEmpty()) {
                delete as user entriesToDelete;
            }
            
            delete as user [
                SELECT Id
                FROM QuoteForce__Price_Book__c
                WHERE Id = :priceBookId WITH USER_MODE
                LIMIT 1
            ];
            
            return true;
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static List<QuoteForce__Price_Book_Entry__c> listPriceBookEntries(
        String searchKey,
        Id priceBookId,
        Id productId,
        String currencyFilter,
        Boolean activeOnly
    ) {
        try {
            String searchTerm = '%' + String.escapeSingleQuotes(String.isBlank(searchKey) ? '' : searchKey.trim()) + '%';
            
           String query =
                        'SELECT Id, Name, QuoteForce__Price_Book__c, QuoteForce__Price_Book__r.Name, QuoteForce__Product__c, QuoteForce__Product__r.Name, QuoteForce__Product__r.QuoteForce__Product_Code__c, QuoteForce__Product__r.QuoteForce__Active__c, ' +
                        'QuoteForce__Product_Code__c, QuoteForce__Currency__c, QuoteForce__Unit_Price__c, QuoteForce__Is_Active__c, CreatedDate ' +
                        'FROM QuoteForce__Price_Book_Entry__c WHERE Id != null ';
                                
            if (String.isNotBlank(searchKey)) {
                query += ' AND (QuoteForce__Product__r.Name LIKE :searchTerm OR QuoteForce__Product_Code__c LIKE :searchTerm OR QuoteForce__Price_Book__r.Name LIKE :searchTerm)';
            }
            if (priceBookId != null) {
                query += ' AND QuoteForce__Price_Book__c = :priceBookId';
            }
            if (productId != null) {
                query += ' AND QuoteForce__Product__c = :productId';
            }
            if (String.isNotBlank(currencyFilter)) {
                query += ' AND QuoteForce__Currency__c = :currencyFilter';
            }
            if (activeOnly == true) {
                query += ' AND QuoteForce__Is_Active__c = true';
            }
            
            query += ' ORDER BY QuoteForce__Price_Book__r.Name ASC, QuoteForce__Product__r.Name ASC, CreatedDate DESC';
            return Database.queryWithBinds(query, new Map<String, Object>{ 'searchTerm' => searchTerm, 'priceBookId' => priceBookId, 'productId' => productId, 'currencyFilter' => currencyFilter }, AccessLevel.USER_MODE);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static List<QuoteForce__Price_Book_Entry__c> getPriceBookEntriesByProduct(Id productId) {
        return listPriceBookEntries(null, null, productId, null, false);
    }
    
    @AuraEnabled
    public static List<QuoteForce__Price_Book_Entry__c> getPriceBookEntriesByPriceBook(Id priceBookId) {
        return listPriceBookEntries(null, priceBookId, null, null, true);
    }
    
   @AuraEnabled
    public static QuoteForce__Price_Book_Entry__c upsertPriceBookEntry(QuoteForce__Price_Book_Entry__c entryRecord) {
        try {
            if (entryRecord == null) {
                throw new AuraHandledException('Price Book Entry data is required.');
            }
            if (entryRecord.QuoteForce__Price_Book__c == null) {
                throw new AuraHandledException('Price Book is required.');
            }
            if (entryRecord.QuoteForce__Product__c == null) {
                throw new AuraHandledException('Product is required.');
            }

            QuoteForce__Price_Book__c priceBookRecord = [
                SELECT Id, QuoteForce__Currency__c
                FROM QuoteForce__Price_Book__c
                WHERE Id = :entryRecord.QuoteForce__Price_Book__c WITH USER_MODE
                LIMIT 1
            ];

            QuoteForce__Product__c productRecord = [
                SELECT Id, QuoteForce__Product_Code__c, QuoteForce__Currency__c, QuoteForce__Default_Price__c
                FROM QuoteForce__Product__c
                WHERE Id = :entryRecord.QuoteForce__Product__c WITH USER_MODE
                LIMIT 1
            ];

            List<QuoteForce__Price_Book_Entry__c> duplicateEntries = [
                SELECT Id
                FROM QuoteForce__Price_Book_Entry__c
                WHERE QuoteForce__Price_Book__c = :entryRecord.QuoteForce__Price_Book__c
                AND QuoteForce__Product__c = :entryRecord.QuoteForce__Product__c
                AND Id != :entryRecord.Id WITH USER_MODE
                LIMIT 1
            ];
            if (!duplicateEntries.isEmpty()) {
                throw new AuraHandledException('This product already has a Price Book Entry in the selected Price Book.');
            }

            entryRecord.QuoteForce__Product_Code__c = productRecord.QuoteForce__Product_Code__c;
            entryRecord.QuoteForce__Currency__c = String.isNotBlank(priceBookRecord.QuoteForce__Currency__c)
                ? priceBookRecord.QuoteForce__Currency__c
                : (
                    String.isNotBlank(entryRecord.QuoteForce__Currency__c)
                    ? entryRecord.QuoteForce__Currency__c
                    : productRecord.QuoteForce__Currency__c
                );
            if (entryRecord.QuoteForce__Unit_Price__c == null) {
                entryRecord.QuoteForce__Unit_Price__c = 0;
            }

            upsert as user entryRecord;

            if (String.isNotBlank(entryRecord.QuoteForce__Currency__c)
                && String.isNotBlank(productRecord.QuoteForce__Currency__c)
                && entryRecord.QuoteForce__Currency__c == productRecord.QuoteForce__Currency__c
                && productRecord.QuoteForce__Default_Price__c != entryRecord.QuoteForce__Unit_Price__c) {

                productRecord.QuoteForce__Default_Price__c = entryRecord.QuoteForce__Unit_Price__c;
                update as user productRecord;
            }

            return [
                SELECT Id, Name, QuoteForce__Price_Book__c, QuoteForce__Price_Book__r.Name, QuoteForce__Product__c, QuoteForce__Product__r.Name, QuoteForce__Product__r.QuoteForce__Product_Code__c,
                QuoteForce__Product_Code__c, QuoteForce__Currency__c, QuoteForce__Unit_Price__c, QuoteForce__Is_Active__c
                FROM QuoteForce__Price_Book_Entry__c
                WHERE Id = :entryRecord.Id WITH USER_MODE
                LIMIT 1
            ];
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static Boolean deletePriceBookEntry(Id entryId) {
        try {
            if (entryId == null) {
                throw new AuraHandledException('Price Book Entry Id is required.');
            }

            QuoteForce__Price_Book_Entry__c entryToDelete = [
                SELECT Id, QuoteForce__Product__c, QuoteForce__Currency__c
                FROM QuoteForce__Price_Book_Entry__c
                WHERE Id = :entryId WITH USER_MODE
                LIMIT 1
            ];

            // Count how many OTHER entries this product still has
            Integer remainingEntryCount = [
                SELECT COUNT() FROM QuoteForce__Price_Book_Entry__c
                WHERE QuoteForce__Product__c = :entryToDelete.QuoteForce__Product__c
                AND Id != :entryId WITH USER_MODE
            ];

            if (remainingEntryCount == 0) {
                throw new AuraHandledException(
                    'This is the only Price Book Entry for this product. Every product must have at least one Price Book Entry — delete the product instead if you no longer need it, or add another entry before removing this one.'
                );
            }

            delete as user entryToDelete;
            
            return true;
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
        
    @AuraEnabled(cacheable=false)
    public static Integer clonePriceBookEntries(Id sourcePriceBookId, Id targetPriceBookId, Boolean overwriteExisting) {
        try {
            if (sourcePriceBookId == null || targetPriceBookId == null) {
                throw new AuraHandledException('Source and target Price Books are required.');
            }
            if (sourcePriceBookId == targetPriceBookId) {
                throw new AuraHandledException('Source and target Price Books must be different.');
            }
            
            QuoteForce__Price_Book__c targetPriceBook = [
                SELECT Id, QuoteForce__Currency__c
                FROM QuoteForce__Price_Book__c
                WHERE Id = :targetPriceBookId WITH USER_MODE
                LIMIT 1
            ];
            
            List<QuoteForce__Price_Book_Entry__c> sourceEntries = [
                SELECT Id, QuoteForce__Product__c, QuoteForce__Product_Code__c, QuoteForce__Currency__c, QuoteForce__Unit_Price__c, QuoteForce__Is_Active__c
                FROM QuoteForce__Price_Book_Entry__c
                WHERE QuoteForce__Price_Book__c = :sourcePriceBookId WITH USER_MODE];
            
            Map<Id, QuoteForce__Price_Book_Entry__c> targetEntryByProductId = new Map<Id, QuoteForce__Price_Book_Entry__c>();
            for (QuoteForce__Price_Book_Entry__c existingEntry : [
                SELECT Id, QuoteForce__Product__c
                FROM QuoteForce__Price_Book_Entry__c
                WHERE QuoteForce__Price_Book__c = :targetPriceBookId WITH USER_MODE]) {
                    targetEntryByProductId.put(existingEntry.QuoteForce__Product__c, existingEntry);
                }
            
            List<QuoteForce__Price_Book_Entry__c> entriesToInsert = new List<QuoteForce__Price_Book_Entry__c>();
            List<QuoteForce__Price_Book_Entry__c> entriesToUpdate = new List<QuoteForce__Price_Book_Entry__c>();
            
            for (QuoteForce__Price_Book_Entry__c sourceEntry : sourceEntries) {
                QuoteForce__Price_Book_Entry__c existingTargetEntry = targetEntryByProductId.get(sourceEntry.QuoteForce__Product__c);
                if (existingTargetEntry != null && overwriteExisting != true) {
                    continue;
                }
                
                QuoteForce__Price_Book_Entry__c workingEntry = existingTargetEntry != null
                    ? new QuoteForce__Price_Book_Entry__c(Id = existingTargetEntry.Id)
                    : new QuoteForce__Price_Book_Entry__c();
                
                workingEntry.QuoteForce__Price_Book__c = targetPriceBookId;
                workingEntry.QuoteForce__Product__c = sourceEntry.QuoteForce__Product__c;
                workingEntry.QuoteForce__Product_Code__c = sourceEntry.QuoteForce__Product_Code__c;
                workingEntry.QuoteForce__Currency__c = String.isNotBlank(targetPriceBook.QuoteForce__Currency__c)
                    ? targetPriceBook.QuoteForce__Currency__c
                    : sourceEntry.QuoteForce__Currency__c;
                workingEntry.QuoteForce__Unit_Price__c = sourceEntry.QuoteForce__Unit_Price__c;
                workingEntry.QuoteForce__Is_Active__c = sourceEntry.QuoteForce__Is_Active__c;
                
                if (existingTargetEntry != null) {
                    entriesToUpdate.add(workingEntry);
                } else {
                    entriesToInsert.add(workingEntry);
                }
            }
            
            if (!entriesToInsert.isEmpty()) {
                insert as user entriesToInsert;
            }
            if (!entriesToUpdate.isEmpty()) {
                update as user entriesToUpdate;
            }
            
            return entriesToInsert.size() + entriesToUpdate.size();
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    private static void clearOtherDefaultPriceBooks(String currencyCode, Id currentPriceBookId) {
        List<QuoteForce__Price_Book__c> priceBooksToReset = new List<QuoteForce__Price_Book__c>(); 
        
        if (String.isBlank(currencyCode)) {
            
            priceBooksToReset = [
                SELECT Id, QuoteForce__Is_Default__c
                FROM QuoteForce__Price_Book__c
                WHERE QuoteForce__Is_Default__c = true
                AND QuoteForce__Currency__c = null
                AND Id != :currentPriceBookId WITH USER_MODE];
            
        } else {
            
            String normalizedCurrencyCode = String.escapeSingleQuotes(currencyCode.trim()); // Added local safe variable for query binding
            
            priceBooksToReset = [
                SELECT Id, QuoteForce__Is_Default__c
                FROM QuoteForce__Price_Book__c
                WHERE QuoteForce__Is_Default__c = true
                AND QuoteForce__Currency__c = :normalizedCurrencyCode // Updated bind variable
                AND Id != :currentPriceBookId WITH USER_MODE];
        }
        
        for (QuoteForce__Price_Book__c priceBookToReset : priceBooksToReset) {
            priceBookToReset.QuoteForce__Is_Default__c = false;
        }
        
        if (!priceBooksToReset.isEmpty()) {
            update as user priceBooksToReset;
        }
    }
    
    private static void validateUnifiedProductCreate(
        QuoteForce__Product__c prod_Obj,
        List<ProductPricingRequest> pricingRows,
        Id currentProductId
    ) {
        System.debug('==DEBUG== code=' + prod_Obj.QuoteForce__Product_Code__c 
                     + ' | curr=' + prod_Obj.QuoteForce__Currency__c 
                     + ' | id=' + currentProductId);
        
        if (prod_Obj == null) {
            throw new AuraHandledException('Product data is required.');
        }
        if (String.isBlank(prod_Obj.Name)) {
            throw new AuraHandledException('Product name is required.');
        }
        if (String.isBlank(prod_Obj.QuoteForce__Product_Code__c)) {
            throw new AuraHandledException('Product Code is required');
        }
        if (prod_Obj.QuoteForce__Default_Price__c != null && prod_Obj.QuoteForce__Default_Price__c < 0) {
            throw new AuraHandledException('Default price must be greater than or equal to 0.');
        }
        if (pricingRows == null || pricingRows.isEmpty()) {
            throw new AuraHandledException('At least one Price Book Entry is required.');
        }
        
        prod_Obj.Name = prod_Obj.Name.trim();
        prod_Obj.QuoteForce__Product_Code__c = prod_Obj.QuoteForce__Product_Code__c.trim();
        prod_Obj.QuoteForce__Currency__c = normalizeCurrencyCode(prod_Obj.QuoteForce__Currency__c);
        
        List<QuoteForce__Product__c> existingProducts = [
            SELECT Id
            FROM QuoteForce__Product__c
            WHERE QuoteForce__Product_Code__c = :prod_Obj.QuoteForce__Product_Code__c
            AND QuoteForce__Currency__c = :prod_Obj.QuoteForce__Currency__c
            AND Id != :currentProductId WITH USER_MODE
            LIMIT 1
        ];
        
        if (!existingProducts.isEmpty()) {
            throw new AuraHandledException('Product with same code and currency already exists');
        }
    }
    
    private static void validatePricingRow(
        ProductPricingRequest pricingRow,
        Map<Id, QuoteForce__Price_Book__c> existingPriceBooksById,
        Map<String, QuoteForce__Price_Book__c> existingPriceBooksByNormalizedName,
        Set<String> rowDuplicateKeys
    ) {
        if (pricingRow == null) {
            throw new AuraHandledException('Pricing row data is required.');
        }
        if (pricingRow.unitPrice == null || pricingRow.unitPrice <= 0) {
            throw new AuraHandledException('Unit Price must be greater than 0.');
        }
        
        if (pricingRow.priceBookId != null) {
            QuoteForce__Price_Book__c existingPriceBook = existingPriceBooksById.get(pricingRow.priceBookId);
            if (existingPriceBook == null) {
                throw new AuraHandledException('Selected Price Book was not found.');
            }
            
            String duplicateKey = 'existing:' + String.valueOf(pricingRow.priceBookId);
            if (rowDuplicateKeys.contains(duplicateKey)) {
                throw new AuraHandledException('The same Price Book cannot appear twice for this product.');
            }
            rowDuplicateKeys.add(duplicateKey);
            return;
        }
        
        if (pricingRow.draftPriceBook == null) {
            throw new AuraHandledException('Each pricing row must select a Price Book or create a new one.');
        }
        
        String draftName = String.isBlank(pricingRow.draftPriceBook.Name)
            ? null
            : pricingRow.draftPriceBook.Name.trim();
        if (String.isBlank(draftName)) {
            throw new AuraHandledException('Price Book name is required.');
        }
        
        String normalizedDraftName = draftName.toLowerCase();
        if (existingPriceBooksByNormalizedName.containsKey(normalizedDraftName)) {
            throw new AuraHandledException('Price Book name must be unique.');
        }
        
        String duplicateKey = 'draft:' + normalizedDraftName;
        if (rowDuplicateKeys.contains(duplicateKey)) {
            throw new AuraHandledException('The same Price Book cannot appear twice for this product.');
        }
        rowDuplicateKeys.add(duplicateKey);
        
        String draftCurrency = normalizeCurrencyCode(pricingRow.draftPriceBook.currencyCode);
        if (String.isBlank(draftCurrency)) {
            throw new AuraHandledException('Price Book currency is required.');
        }
        if (pricingRow.draftPriceBook.isDefault == true && pricingRow.draftPriceBook.isActive == false) {
            throw new AuraHandledException('Default Price Book must be active.');
        }
    }
    
    private static String normalizeCurrencyCode(String currencyCode) {
        return String.isBlank(currencyCode) ? null : currencyCode.trim().toUpperCase();
    }
    
    private static void syncPriceBookEntries(List<QuoteForce__Product_Line_Items__c> lineItems) {
        if (lineItems == null || lineItems.isEmpty()) {
            return;
        }
        
        Set<Id> priceBookEntryIds = new Set<Id>();
        Set<Id> bundleIds = new Set<Id>();
        for (QuoteForce__Product_Line_Items__c lineItem : lineItems) {
            if (lineItem == null) {
                continue;
            }
            if (lineItem.QuoteForce__Price_Book_Entry__c != null) {
                priceBookEntryIds.add(lineItem.QuoteForce__Price_Book_Entry__c);
            }
            if (lineItem.QuoteForce__Product_Bundle__c != null) {
                bundleIds.add(lineItem.QuoteForce__Product_Bundle__c);
            }
        }
        
        Map<Id, QuoteForce__Price_Book_Entry__c> entryById = priceBookEntryIds.isEmpty()
            ? new Map<Id, QuoteForce__Price_Book_Entry__c>()
            : new Map<Id, QuoteForce__Price_Book_Entry__c>([
                SELECT Id, QuoteForce__Product__c, QuoteForce__Product_Code__c, QuoteForce__Currency__c, QuoteForce__Unit_Price__c, QuoteForce__Price_Book__c
                FROM QuoteForce__Price_Book_Entry__c
                WHERE Id IN :priceBookEntryIds WITH USER_MODE]);
        
        Map<Id, QuoteForce__Product_Bundle__c> bundleById = bundleIds.isEmpty()
            ? new Map<Id, QuoteForce__Product_Bundle__c>()
            : new Map<Id, QuoteForce__Product_Bundle__c>([
                SELECT Id, QuoteForce__Price_Book__c
                FROM QuoteForce__Product_Bundle__c
                WHERE Id IN :bundleIds WITH USER_MODE]);
        
        for (QuoteForce__Product_Line_Items__c lineItem : lineItems) {
            if (lineItem == null) {
                continue;
            }
            
            if (lineItem.QuoteForce__Price_Book_Entry__c == null) {
                if (lineItem.QuoteForce__Product__c == null) {
                    lineItem.QuoteForce__ProductCode__c = null;
                    lineItem.QuoteForce__Currency__c = null;
                    
                }
                continue;
            }
            
            QuoteForce__Price_Book_Entry__c entryRecord = entryById.get(lineItem.QuoteForce__Price_Book_Entry__c);
            if (entryRecord == null) {
                throw new AuraHandledException('Selected Price Book Entry was not found.');
            }
            
            QuoteForce__Product_Bundle__c bundleRecord = bundleById.get(lineItem.QuoteForce__Product_Bundle__c);
            if (bundleRecord != null && bundleRecord.QuoteForce__Price_Book__c != null && bundleRecord.QuoteForce__Price_Book__c != entryRecord.QuoteForce__Price_Book__c) {
                throw new AuraHandledException('Selected Price Book Entry does not belong to the bundle Price Book.');
            }
            
            lineItem.QuoteForce__Product__c = entryRecord.QuoteForce__Product__c;
            lineItem.QuoteForce__ProductCode__c = entryRecord.QuoteForce__Product_Code__c;
            lineItem.QuoteForce__Currency__c = entryRecord.QuoteForce__Currency__c;
            if (lineItem.QuoteForce__Price__c == null || lineItem.QuoteForce__Price__c == 0) {
                lineItem.QuoteForce__Price__c = entryRecord.QuoteForce__Unit_Price__c;
            }
        }
    }
    @AuraEnabled
    public static void updatePriceBookEntriesPrice(Id productId, Decimal newPrice, String currencyCode) {
        try {
            List<QuoteForce__Price_Book_Entry__c> entries = [
                SELECT Id, QuoteForce__Unit_Price__c
                FROM QuoteForce__Price_Book_Entry__c
                WHERE QuoteForce__Product__c = :productId
                AND QuoteForce__Currency__c = :currencyCode
                WITH USER_MODE
            ];

            if (entries.isEmpty()) {
                throw new AuraHandledException(
                    'No matching Price Book Entry found for currency ' + currencyCode +
                    '. Please create one from the Price Book Entries tab first.'
                );
            }

            for (QuoteForce__Price_Book_Entry__c entry : entries) {
                entry.QuoteForce__Unit_Price__c = newPrice;
            }
            update as user entries;

        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    @AuraEnabled
    public static Boolean isPriceBookEntryUsedInBundle(Id priceBookEntryId) {
        Integer count = [
            SELECT COUNT()
            FROM QuoteForce__Product_Line_Items__c
            WHERE QuoteForce__Price_Book_Entry__c = :priceBookEntryId
            WITH USER_MODE
        ];
        return count > 0;
    }
}