public with sharing class ProductConfigurationController {
    public class ProductPricingDetails {
        @AuraEnabled public Id productId { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public Decimal defaultPrice { get; set; }
        @AuraEnabled public Decimal defaultQuantity { get; set; }
        @AuraEnabled public Id priceBookEntryId { get; set; }
        @AuraEnabled public String productCode { get; set; }
        @AuraEnabled public String currencyCode { get; set; }
    }
    
    @AuraEnabled(cacheable=true)
    public static QuoteForce__Product__c getProductDetails(Id productId) {
        return [SELECT Id, Name, QuoteForce__Default_Price__c, QuoteForce__Default_Quantity__c FROM QuoteForce__Product__c WHERE Id = :productId WITH USER_MODE LIMIT 1];          
    }
    
    @AuraEnabled(cacheable=true)
    public static ProductPricingDetails getProductDetailsForContext(Id productId, Id quoteId, Id invoiceId) {
        QuoteForce__Product__c productRecord = [
            SELECT Id, Name, QuoteForce__Default_Price__c, QuoteForce__Default_Quantity__c, QuoteForce__Product_Code__c, QuoteForce__Currency__c
            FROM QuoteForce__Product__c
            WHERE Id = :productId WITH USER_MODE
            LIMIT 1
        ];
        
        Set<Id> productIds = new Set<Id>{ productId };
            QuoteForcePricingService.PricingResult pricing;
        if (quoteId != null) {
            pricing = QuoteForcePricingService.resolveQuoteProductPricing(quoteId, productIds).get(productId);
        } else if (invoiceId != null) {
            pricing = QuoteForcePricingService.resolveInvoiceProductPricing(invoiceId, productIds).get(productId);
        }
        
        ProductPricingDetails details = new ProductPricingDetails();
        details.productId = productRecord.Id;
        details.name = productRecord.Name;
        details.defaultPrice = pricing != null ? pricing.unitPrice : productRecord.QuoteForce__Default_Price__c;
        details.defaultQuantity = productRecord.QuoteForce__Default_Quantity__c;
        details.priceBookEntryId = pricing != null ? pricing.priceBookEntryId : null;
        details.productCode = pricing != null && String.isNotBlank(pricing.productCode)
            ? pricing.productCode
            : productRecord.QuoteForce__Product_Code__c;
        details.currencyCode = pricing != null && String.isNotBlank(pricing.currencyCode)
            ? pricing.currencyCode
            : productRecord.QuoteForce__Currency__c;
        return details;
    }
    
    
    
    public class ProductBundleWrapper{
        @AuraEnabled 
        public string Id{get;set;}
        @AuraEnabled 
        public string Name{get;set;}
        @AuraEnabled 
        public string Description{get;set;}
        @AuraEnabled 
        public String CurrencyType;
        @AuraEnabled
        public String PriceBookId;
        @AuraEnabled
        public String PriceBookName;
        @AuraEnabled 
        public List<ProductLineItemWrapper> ProductLineItemWrapperList{get;set;}
    }
    
    public class ProductLineItemWrapper{
        @AuraEnabled 
        public string Id{get;set;}
        @AuraEnabled 
        public string Name{get;set;}
        @AuraEnabled 
        public string UnitOfMeasurement{get;set;}
        @AuraEnabled 
        public string productName{get;set;}
        @AuraEnabled 
        public Decimal unitCost{get;set;}
        @AuraEnabled 
        public Decimal Qty{get;set;}
        @AuraEnabled
        public String PriceBookEntryId{get;set;}
        @AuraEnabled
        public String PriceBookId{get;set;}
    }
    
    public static List<ProductBundleWrapper> getProductWithProductBundle() {
        return getProductWithProductBundle(null);
    }
    
    @AuraEnabled(cacheable=true)
    public static list<ProductBundleWrapper> getProductWithProductBundle(String currencyCode){
        
        List<ProductBundleWrapper> productWrapperList = new List<ProductBundleWrapper>();
        
        List<QuoteForce__Product_Bundle__c> bundlelist;
        if (String.isBlank(currencyCode)) {
            bundlelist = [
                SELECT Id, Name, QuoteForce__Description__c, QuoteForce__Currency__c, QuoteForce__Price_Book__c, QuoteForce__Price_Book__r.Name,
                (
                    SELECT Id, QuoteForce__Product__c, QuoteForce__Product__r.Name, Name, QuoteForce__Price__c, QuoteForce__Quantity__c, QuoteForce__Unit_Of_Measurement__c,
                    QuoteForce__Price_Book_Entry__c, QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__c, QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__r.Name
                    FROM QuoteForce__Product_Line_Items__r
                    ORDER BY CreatedDate ASC
                )
                FROM QuoteForce__Product_Bundle__c WITH USER_MODE  LIMIT 200
            ];
        } else {
            bundlelist = [
                SELECT Id, Name, QuoteForce__Description__c, QuoteForce__Currency__c, QuoteForce__Price_Book__c, QuoteForce__Price_Book__r.Name,
                (
                    SELECT Id, QuoteForce__Product__c, QuoteForce__Product__r.Name, Name, QuoteForce__Price__c, QuoteForce__Quantity__c, QuoteForce__Unit_Of_Measurement__c,
                    QuoteForce__Price_Book_Entry__c, QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__c, QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__r.Name
                    FROM QuoteForce__Product_Line_Items__r
                    ORDER BY CreatedDate ASC
                )
                FROM QuoteForce__Product_Bundle__c
                WHERE QuoteForce__Currency__c = :currencyCode WITH USER_MODE
            ];
        }
        if(!bundlelist.isEmpty()){
            for(QuoteForce__Product_Bundle__c pbObj : bundlelist){
                ProductBundleWrapper pbWrapObj = new ProductBundleWrapper();
                pbWrapObj.Id = pbObj.Id;
                pbWrapObj.Name = pbObj.Name;
                pbWrapObj.Description = pbObj.QuoteForce__Description__c;
                pbWrapObj.CurrencyType = pbObj.QuoteForce__Currency__c;
                String resolvedPriceBookId = pbObj.QuoteForce__Price_Book__c;
                String resolvedPriceBookName = pbObj.QuoteForce__Price_Book__r != null ? pbObj.QuoteForce__Price_Book__r.Name : null;
                List<ProductLineItemWrapper> proItemWrapList = new List<ProductLineItemWrapper>();
                for(QuoteForce__Product_Line_Items__c ProdObj : pbObj.QuoteForce__Product_Line_Items__r){
                    ProductLineItemWrapper proLineItemObj = new ProductLineItemWrapper();
                    proLineItemObj.Id = ProdObj.Id;
                    proLineItemObj.Name = ProdObj.QuoteForce__Product__r.Name;
                    proLineItemObj.unitCost = ProdObj.QuoteForce__Price__c;
                    proLineItemObj.UnitOfMeasurement = ProdObj.QuoteForce__Unit_Of_Measurement__c;
                    proLineItemObj.productName = ProdObj.QuoteForce__Product__c;
                    proLineItemObj.Qty = ProdObj.QuoteForce__Quantity__c;
                    proLineItemObj.PriceBookEntryId = ProdObj.QuoteForce__Price_Book_Entry__c;
                    proLineItemObj.PriceBookId = ProdObj.QuoteForce__Price_Book_Entry__r != null ? ProdObj.QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__c : null;
                    if (String.isBlank(resolvedPriceBookId) && ProdObj.QuoteForce__Price_Book_Entry__r != null) {
                        resolvedPriceBookId = ProdObj.QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__c;
                        resolvedPriceBookName = ProdObj.QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__r != null
                            ? ProdObj.QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__r.Name
                            : null;
                    }
                    proItemWrapList.add(proLineItemObj);
                }
                pbWrapObj.PriceBookId = resolvedPriceBookId;
                pbWrapObj.PriceBookName = resolvedPriceBookName;
                pbWrapObj.ProductLineItemWrapperList = proItemWrapList;
                productWrapperList.add(pbWrapObj);
            }
        }
        
        return productWrapperList;
    }
    
    @AuraEnabled(cacheable=true)
    public static List<ProductBundleWrapper> getProductWithProductBundleForContext(Id quoteId, Id invoiceId) {
        String currencyCode;
        if (invoiceId != null) {
            currencyCode = resolveInvoiceSnapshotCurrency(invoiceId);
        } else if (quoteId != null) {
            currencyCode = QuoteForcePricingService.resolveQuoteCurrency(quoteId);
        }
        return getProductWithProductBundle(currencyCode);
    }
    
    @AuraEnabled(cacheable=true)
    public static Id getContextPriceBookId(Id quoteId, Id invoiceId) {
        if (invoiceId != null) {
            List<QuoteForce__Invoice__c> invoices = [
                SELECT Id, QuoteForce__Price_Book__c, QuoteForce__Quotes__r.QuoteForce__Price_Book__c
                FROM QuoteForce__Invoice__c
                WHERE Id = :invoiceId WITH USER_MODE
                LIMIT 1
            ];
            if (!invoices.isEmpty()) {
                return invoices[0].QuoteForce__Price_Book__c != null
                    ? invoices[0].QuoteForce__Price_Book__c
                    : invoices[0].QuoteForce__Quotes__r != null
                        ? invoices[0].QuoteForce__Quotes__r.QuoteForce__Price_Book__c
                        : null;
            }
            return null;
        }
        
        if (quoteId != null) {
            List<QuoteForce__Quotes__c> quotes = [
                SELECT Id, QuoteForce__Price_Book__c
                FROM QuoteForce__Quotes__c
                WHERE Id = :quoteId WITH USER_MODE
                LIMIT 1
            ];
            return quotes.isEmpty() ? null : quotes[0].QuoteForce__Price_Book__c;
        }
        
        return null;
    }
    
    @AuraEnabled
    public static void createProductLineItem(Id quoteId, List<Map<String, Object>> lineItems) {
        QuoteForceSecurityUtil.assertCreateable(QuoteForce__QuoteLineItem__c.SObjectType);
        List<QuoteForce__QuoteLineItem__c> qliList = new List<QuoteForce__QuoteLineItem__c>();
        
        for (Map<String, Object> item : lineItems) {
            QuoteForce__QuoteLineItem__c qli = new QuoteForce__QuoteLineItem__c();
            qli.QuoteForce__Quotes__c = quoteId;
            
            if (item.containsKey('QuoteForce__Product__c')) {
                qli.QuoteForce__Product__c = (Id)item.get('QuoteForce__Product__c');
            }
            if (item.containsKey('QuoteForce__Quantity__c')) {
                qli.QuoteForce__Quantity__c = (Decimal)item.get('QuoteForce__Quantity__c');
            }
            if (item.containsKey('QuoteForce__Price__c')) {
                qli.QuoteForce__Price__c = (Decimal)item.get('QuoteForce__Price__c');
            }
            if (item.containsKey('QuoteForce__Section_Id__c')) {
                qli.QuoteForce__Section_Id__c = (String)item.get('QuoteForce__Section_Id__c');
            }
            
            qliList.add(qli);
        }
        
        if (!qliList.isEmpty()) {
            applyQuoteLineItemSnapshots(quoteId, qliList, true);
            List<QuoteForce__QuoteLineItem__c> sanitizedLineItems = (List<QuoteForce__QuoteLineItem__c>) Security.stripInaccessible(
                AccessType.CREATABLE,
                qliList
            ).getRecords();
            insert as user sanitizedLineItems;
        }
    }
    
    
    @AuraEnabled
    public static QuoteForce__Quotes__c fetchingQuoteLineFromQuotes (Id quoteId) {
        return [
            SELECT Id,
            (SELECT Id, QuoteForce__Unit_Of_Measurement__c, QuoteForce__Quantity__c, QuoteForce__Price__c, QuoteForce__Product__c,QuoteForce__Section_Id__c
             FROM QuoteForce__QuoteLineItems__r)
            FROM QuoteForce__Quotes__c
            WHERE Id = :quoteId WITH USER_MODE
            LIMIT 1
        ];
    }
    
    
    
    @AuraEnabled
    public static List<QuoteForce__QuoteLineItem__c> insertQuoteLineItemsFromTemplate(Id masterTemplateId, Id quoteId) {
        QuoteForce__Master_Template__c mt = [
            SELECT Id,
            (SELECT Id, QuoteForce__Unit_Of_Measurement__c, QuoteForce__Quantity__c, QuoteForce__Price__c, QuoteForce__Product__c,QuoteForce__Section_Id__c
             FROM QuoteForce__QuoteLineItems__r)
            FROM QuoteForce__Master_Template__c
            WHERE Id = :masterTemplateId WITH USER_MODE
            LIMIT 1
        ];
        
        List<QuoteForce__QuoteLineItem__c> newQuoteItems = new List<QuoteForce__QuoteLineItem__c>();
        
        for (QuoteForce__QuoteLineItem__c item : mt.QuoteForce__QuoteLineItems__r) {
            newQuoteItems.add(new QuoteForce__QuoteLineItem__c(
                QuoteForce__Unit_Of_Measurement__c = item.QuoteForce__Unit_Of_Measurement__c,
                QuoteForce__Quantity__c = item.QuoteForce__Quantity__c,
                QuoteForce__Price__c = item.QuoteForce__Price__c,
                QuoteForce__Product__c = item.QuoteForce__Product__c,
                QuoteForce__Quotes__c = quoteId,
                QuoteForce__Type__c = 'Quote Product'
            ));
        }
        
        if (!newQuoteItems.isEmpty()) {
            applyQuoteLineItemSnapshots(quoteId, newQuoteItems, true);
            insert as user newQuoteItems;
        }
        
        return newQuoteItems;
    }
    
    
    @AuraEnabled
    public static void createQuoteLineItems(Id parentId, List<Map<String, Object>> lineItems) {
        List<QuoteForce__QuoteLineItem__c> qliList = new List<QuoteForce__QuoteLineItem__c>();
        
        for (Map<String, Object> item : lineItems) {
            Id productId = (Id)item.get('prodId');
            Decimal quantity = (Decimal)item.get('Quantity');
            Decimal unitPrice = (Decimal)item.get('Price');
            String measurementType = (String)item.get('MeasurementType');
            String type = (String)item.get('Type');
            Boolean isQuote = (Boolean)item.get('isQuote');
            String sectionId = (String)item.get('sectionId'); 
            
            if (productId != null && quantity != null && unitPrice != null) {
                QuoteForce__QuoteLineItem__c qli = new QuoteForce__QuoteLineItem__c(
                    QuoteForce__Product__c = productId,
                    QuoteForce__Quantity__c = quantity,
                    QuoteForce__Price__c = unitPrice,
                    QuoteForce__Unit_Of_Measurement__c = measurementType,
                    QuoteForce__Type__c = isQuote ? 'Quote Product' : 'Master Template Product',
                    QuoteForce__Section_Id__c = sectionId
                );
                
                if (isQuote) {
                    qli.QuoteForce__Quotes__c = parentId;
                } else {
                    qli.QuoteForce__Master_Template__c = parentId;
                }
                
                qliList.add(qli);
            }
        }
        
        if (!qliList.isEmpty()) {
            applyQuoteLineItemSnapshots(parentId, qliList, true);
            insert as user qliList;
        }
    }
    
    
    @AuraEnabled
    public static void updateQuoteLineItems(Id parentId,List<Map<String, Object>> lineItems) {
        List<QuoteForce__QuoteLineItem__c> recordsToUpdate = new List<QuoteForce__QuoteLineItem__c>();
        List<QuoteForce__QuoteLineItem__c> recordsToReprice = new List<QuoteForce__QuoteLineItem__c>();
        Set<Id> recordIds = new Set<Id>();
        for (Map<String, Object> item : lineItems) {
            if (item.get('id') != null) {
                recordIds.add((Id)item.get('id'));
            }
        }
        
        Map<Id, QuoteForce__QuoteLineItem__c> existingById = recordIds.isEmpty()
            ? new Map<Id, QuoteForce__QuoteLineItem__c>()
            : new Map<Id, QuoteForce__QuoteLineItem__c>([
                SELECT Id, QuoteForce__Product__c
                FROM QuoteForce__QuoteLineItem__c
                WHERE Id IN :recordIds WITH USER_MODE]);
        
        for (Map<String, Object> item : lineItems) {
            Id recordId = (Id)item.get('id');
            Id productId = (Id)item.get('prodId');
            Decimal quantity = (Decimal)item.get('Quantity');
            Decimal price = (Decimal)item.get('Price');
            String measurementType = (String)item.get('MeasurementType');
            String type = (String)item.get('Type');
            Boolean isQuote = (Boolean)item.get('isQuote');
            
            if (recordId != null) {
                QuoteForce__QuoteLineItem__c qli = new QuoteForce__QuoteLineItem__c(
                    Id = recordId,
                    QuoteForce__Product__c = productId,
                    QuoteForce__Quantity__c = quantity,
                    QuoteForce__Price__c = price,
                    QuoteForce__Unit_Of_Measurement__c = measurementType,
                    QuoteForce__Type__c = type
                );
                
                if (isQuote) {
                    qli.QuoteForce__Quotes__c = parentId;
                } else {
                    qli.QuoteForce__Master_Template__c = parentId;
                }
                recordsToUpdate.add(qli);
                
                if (isQuote) {
                    QuoteForce__QuoteLineItem__c existingRecord = existingById.get(recordId);
                    Boolean productChanged = existingRecord != null && productId != existingRecord.QuoteForce__Product__c;
                    if (productChanged && productId != null) {
                        recordsToReprice.add(qli);
                    } else if (productId == null) {
                        qli.QuoteForce__Price_Book_Entry__c = null;
                        qli.QuoteForce__ProductCode__c = null;
                        qli.QuoteForce__Currency__c = null;
                    }
                }
            }
        }
        
        if (!recordsToUpdate.isEmpty()) {
            if (!recordsToReprice.isEmpty()) {
                applyQuoteLineItemSnapshots(parentId, recordsToReprice, true);
            }
            update as user recordsToUpdate;
        }
    }
    
    @AuraEnabled
    public static void deleteQuoteLineItems(Id parentId, List<Id> quoteLineItemIds) {
        if (parentId == null || quoteLineItemIds == null || quoteLineItemIds.isEmpty()) {
            return;
        }
        
        List<QuoteForce__QuoteLineItem__c> itemsToDelete = [
            SELECT Id 
            FROM QuoteForce__QuoteLineItem__c 
            WHERE Id IN :quoteLineItemIds
            AND (QuoteForce__Master_Template__c = :parentId OR QuoteForce__Quotes__c = :parentId) WITH USER_MODE];
        
        if (!itemsToDelete.isEmpty()) {
            delete as user itemsToDelete;
        }
    }
    
    @AuraEnabled
    public static void deleteQuoteLineItemsBySection(Id parentId, String sectionId) {
        if (parentId == null || String.isBlank(sectionId)) return;
        List<QuoteForce__QuoteLineItem__c> itemsToDelete = [
            SELECT Id 
            FROM QuoteForce__QuoteLineItem__c 
            WHERE QuoteForce__Section_Id__c = :sectionId 
            AND (QuoteForce__Master_Template__c = :parentId OR QuoteForce__Quotes__c = :parentId) WITH USER_MODE];
        
        if (!itemsToDelete.isEmpty()) {
            delete as user itemsToDelete;
        }
    }
    
    
    
    @AuraEnabled
    public static Boolean createProductConfigs(List<QuoteForce__Product_Configuration__c> productList){
        try{
            System.debug('## mine: '+ productList);
            INSERT (List<QuoteForce__Product_Configuration__c>) productList;
            return true;
        }catch(exception ex){
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    @AuraEnabled
    public static QuoteForce__Product_Section__c createProductSection(QuoteForce__Product_Section__c ProdSecObj){
        try{
            insert as user ProdSecObj;
            return ProdSecObj;
        }catch(exception ex){
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    
    
    @AuraEnabled
    public static List<QuoteForce__Product_Section__c> getSectionData(Id quoteId) {
        if (quoteId == null) {
            return [
                SELECT Id, Name, QuoteForce__Notes__c, QuoteForce__Quotes__c, QuoteForce__Master_Template__c,
                (
                    SELECT Id, QuoteForce__Product__c, QuoteForce__Product__r.Name, QuoteForce__Product__r.QuoteForce__Product_Code__c, QuoteForce__Quantity__c, QuoteForce__Price__c,
                    QuoteForce__Price_Book_Entry__c, QuoteForce__Price_Book_Entry__r.Name, QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__c,
                    QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.Name, QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.QuoteForce__Product_Code__c
                    FROM QuoteForce__QuoteLineItems__r
                    WHERE QuoteForce__Master_Template__c = null
                    AND QuoteForce__Quotes__c = null
                    ORDER BY CreatedDate ASC
                )
                FROM QuoteForce__Product_Section__c
                WHERE QuoteForce__Master_Template__c = null
                AND QuoteForce__Quotes__c = null
                AND CreatedById = :UserInfo.getUserId() WITH USER_MODE
                ORDER BY CreatedDate ASC
            ];
        }
        
        return [
            SELECT Id, Name, QuoteForce__Notes__c, QuoteForce__Quotes__c, QuoteForce__Master_Template__c,
            (
                SELECT Id, QuoteForce__Product__c, QuoteForce__Product__r.Name, QuoteForce__Product__r.QuoteForce__Product_Code__c, QuoteForce__Quantity__c, QuoteForce__Price__c,
                QuoteForce__Price_Book_Entry__c, QuoteForce__Price_Book_Entry__r.Name, QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__c,
                QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.Name, QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.QuoteForce__Product_Code__c
                FROM QuoteForce__QuoteLineItems__r
                ORDER BY CreatedDate ASC
            )
            FROM QuoteForce__Product_Section__c
            WHERE QuoteForce__Master_Template__c = :quoteId WITH USER_MODE
            ORDER BY CreatedDate ASC
        ];
    }
    
    @AuraEnabled
    public static List<QuoteForce__Product_Section__c> getSectionDataQuote(Id quoteId) {
        
        List<QuoteForce__Product_Section__c> sections = [
            SELECT Id, Name, QuoteForce__Notes__c, QuoteForce__Quotes__c, QuoteForce__Master_Template__c,
            (SELECT Id, QuoteForce__Product__c, QuoteForce__Product__r.Name, QuoteForce__Product__r.QuoteForce__Product_Code__c, QuoteForce__Quantity__c, QuoteForce__Price__c,
             QuoteForce__Price_Book_Entry__c, QuoteForce__Price_Book_Entry__r.Name, QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__c,
             QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.Name, QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.QuoteForce__Product_Code__c
             FROM QuoteForce__QuoteLineItems__r
             WHERE QuoteForce__Quotes__c = :quoteId
             ORDER BY CreatedDate ASC)
            FROM QuoteForce__Product_Section__c
            WHERE QuoteForce__Quotes__c = :quoteId WITH USER_MODE
            ORDER BY CreatedDate ASC
        ];
        
        return sections;
    }
    
    @AuraEnabled
    public static void saveSections(List<QuoteForce__Product_Section__c> sectionsToSave) {
        List<QuoteForce__Product_Section__c> toInsert = new List<QuoteForce__Product_Section__c>();
        List<QuoteForce__Product_Section__c> toUpdate = new List<QuoteForce__Product_Section__c>();
        
        for (QuoteForce__Product_Section__c sec : sectionsToSave) {
            if (String.isBlank(sec.Id)) {
                toInsert.add(sec);
            } else {
                toUpdate.add(sec);
            }
        }
        
        if (!toInsert.isEmpty()) insert as user toInsert;
        if (!toUpdate.isEmpty()) update as user toUpdate;
    }
    
    @AuraEnabled
    public static void saveQuoteLineItems(List<QuoteForce__QuoteLineItem__c> itemsToSave) {
        List<QuoteForce__QuoteLineItem__c> toInsert = new List<QuoteForce__QuoteLineItem__c>();
        List<QuoteForce__QuoteLineItem__c> toUpdate = new List<QuoteForce__QuoteLineItem__c>();
        
        for (QuoteForce__QuoteLineItem__c item : itemsToSave) {
            if (String.isBlank(item.Id)) {
                toInsert.add(item);
            } else {
                toUpdate.add(item);
            }
        }
        
        if (!toInsert.isEmpty()) insert as user toInsert;
        if (!toUpdate.isEmpty()) update as user toUpdate;
    }
    
    @AuraEnabled(cacheable=false)
    public static void deleteQuoteLineItem(Id itemId) {
        QuoteForceSecurityUtil.assertDeletable(QuoteForce__QuoteLineItem__c.SObjectType);
        // Capture the parent section BEFORE deleting the item so we can remove a
        // section that becomes empty. QuoteLineItem -> Product_Section is a lookup
        // (no cascade), so otherwise the emptied section is left orphaned in the DB
        // and its heading lingers in the PDF even though the editor hides it.
        QuoteForce__QuoteLineItem__c item = [
            SELECT Id, QuoteForce__Product_Section__c
            FROM QuoteForce__QuoteLineItem__c
            WHERE Id = :itemId WITH USER_MODE LIMIT 1
        ];
        Id sectionId = item.QuoteForce__Product_Section__c;
        delete as user item;

        // If that was the last line item, delete the now-empty section. Guarded by
        // isDeletable() so a user without section-delete access still deletes the
        // line item cleanly (the PDF skip-guard hides the empty section regardless).
        if (sectionId != null
            && QuoteForce__Product_Section__c.SObjectType.getDescribe().isDeletable()) {
            Integer remaining = [
                SELECT COUNT()
                FROM QuoteForce__QuoteLineItem__c
                WHERE QuoteForce__Product_Section__c = :sectionId WITH USER_MODE
            ];
            if (remaining == 0) {
                delete as user [
                    SELECT Id FROM QuoteForce__Product_Section__c
                    WHERE Id = :sectionId WITH USER_MODE LIMIT 1
                ];
            }
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static void deleteSection(Id sectionId) {
        QuoteForceSecurityUtil.assertDeletable(QuoteForce__QuoteLineItem__c.SObjectType);
        QuoteForceSecurityUtil.assertDeletable(QuoteForce__Product_Section__c.SObjectType);
        // First delete as user child QuoteForce__QuoteLineItem__c records
        List<QuoteForce__QuoteLineItem__c> children = [SELECT Id FROM QuoteForce__QuoteLineItem__c WHERE QuoteForce__Product_Section__c = :sectionId WITH USER_MODE];
        if (!children.isEmpty()) {
            delete as user children;
        }
        
        // Now delete as user the section itself
        delete as user [SELECT Id FROM QuoteForce__Product_Section__c WHERE Id = :sectionId WITH USER_MODE LIMIT 1];
    }
    
   @AuraEnabled
public static QuoteForce__Product_Section__c createNewSection(Id quoteId, String sectionName) {
    QuoteForceSecurityUtil.assertCreateable(QuoteForce__Product_Section__c.SObjectType);

    List<QuoteForce__Product_Section__c> existing = [
        SELECT Id, Name, QuoteForce__Master_Template__c, QuoteForce__Notes__c
        FROM QuoteForce__Product_Section__c
        WHERE QuoteForce__Master_Template__c = :quoteId
        AND Name = :sectionName WITH USER_MODE
        ORDER BY CreatedDate ASC
        LIMIT 1
    ];

    if (!existing.isEmpty()) {
        System.debug('@@@ createNewSection: existing section found, skipping insert. Id=' + existing[0].Id + ' | Name=' + existing[0].Name);
        return existing[0];
    }

    QuoteForce__Product_Section__c newSection = new QuoteForce__Product_Section__c(
        Name = sectionName,
        QuoteForce__Master_Template__c = quoteId,
        QuoteForce__Notes__c = ''
    );
    List<QuoteForce__Product_Section__c> sanitizedRecords = (List<QuoteForce__Product_Section__c>) Security.stripInaccessible(
        AccessType.CREATABLE,
        new List<QuoteForce__Product_Section__c>{ newSection }
    ).getRecords();
    insert as user sanitizedRecords[0];
    System.debug('@@@ createNewSection: new section inserted. Id=' + sanitizedRecords[0].Id + ' | Name=' + sanitizedRecords[0].Name);
    return sanitizedRecords[0];
}
    
    
    @AuraEnabled
    public static QuoteForce__Product_Section__c createNewSectionQuote(Id quoteId, String sectionName) {
        QuoteForceSecurityUtil.assertCreateable(QuoteForce__Product_Section__c.SObjectType);
        
        // Guard: agar same Name ka section already is Quote ke against exist karta hai,
        // to wahi return karo, naya insert mat karo. Ye repeated/duplicate calls
        // (LWC re-render, double click, retry) se DB ko clean rakhega.
        List<QuoteForce__Product_Section__c> existing = [
            SELECT Id, Name, QuoteForce__Quotes__c, QuoteForce__Notes__c
            FROM QuoteForce__Product_Section__c
            WHERE QuoteForce__Quotes__c = :quoteId
            AND Name = :sectionName WITH USER_MODE
            ORDER BY CreatedDate ASC
            LIMIT 1
        ];
        
        if (!existing.isEmpty()) {
            System.debug('@@@ createNewSectionQuote: existing section found, skipping insert. Id=' + existing[0].Id + ' | Name=' + existing[0].Name);
            return existing[0];
        }
        
        QuoteForce__Product_Section__c newSection = new QuoteForce__Product_Section__c(
            Name = sectionName,
            QuoteForce__Quotes__c = quoteId,
            QuoteForce__Notes__c = ''
        );
        List<QuoteForce__Product_Section__c> sanitizedRecords = (List<QuoteForce__Product_Section__c>) Security.stripInaccessible(
            AccessType.CREATABLE,
            new List<QuoteForce__Product_Section__c>{ newSection }
        ).getRecords();
        insert as user sanitizedRecords[0];
        System.debug('@@@ createNewSectionQuote: new section inserted. Id=' + sanitizedRecords[0].Id + ' | Name=' + sanitizedRecords[0].Name);
        return sanitizedRecords[0];
    }
 @AuraEnabled
public static QuoteForce__Product_Section__c createNewSectionInvoice(Id invoiceId, String sectionName) {
    QuoteForceSecurityUtil.assertCreateable(QuoteForce__Product_Section__c.SObjectType);

    List<QuoteForce__Product_Section__c> existing = [
        SELECT Id, Name, QuoteForce__Invoice__c, QuoteForce__Notes__c
        FROM QuoteForce__Product_Section__c
        WHERE QuoteForce__Invoice__c = :invoiceId
        AND Name = :sectionName WITH USER_MODE
        ORDER BY CreatedDate ASC
        LIMIT 1
    ];

    if (!existing.isEmpty()) {
        System.debug('@@@ createNewSectionInvoice: existing section found, skipping insert. Id=' + existing[0].Id + ' | Name=' + existing[0].Name);
        return existing[0];
    }

    QuoteForce__Product_Section__c newSection = new QuoteForce__Product_Section__c(
        Name = sectionName,
        QuoteForce__Invoice__c = invoiceId,
        QuoteForce__Notes__c = ''
    );
    List<QuoteForce__Product_Section__c> sanitizedRecords = (List<QuoteForce__Product_Section__c>) Security.stripInaccessible(
        AccessType.CREATABLE,
        new List<QuoteForce__Product_Section__c>{ newSection }
    ).getRecords();
    insert as user sanitizedRecords[0];
    System.debug('@@@ createNewSectionInvoice: new section inserted. Id=' + sanitizedRecords[0].Id + ' | Name=' + sanitizedRecords[0].Name);
    return sanitizedRecords[0];
}
    
    @AuraEnabled
    public static QuoteForce__QuoteLineItem__c createNewSectionProduct(Id quoteId , Id sectionId) {
        QuoteForceSecurityUtil.assertCreateable(QuoteForce__QuoteLineItem__c.SObjectType);
        QuoteForce__QuoteLineItem__c newSection = new QuoteForce__QuoteLineItem__c(
            QuoteForce__Master_Template__c = quoteId,
            QuoteForce__Type__c = 'Master Template Product',
            QuoteForce__Product_Section__c = sectionId
        );
        List<QuoteForce__QuoteLineItem__c> sanitizedRecords = (List<QuoteForce__QuoteLineItem__c>) Security.stripInaccessible(
            AccessType.CREATABLE,
            new List<QuoteForce__QuoteLineItem__c>{ newSection }
        ).getRecords();
        insert as user sanitizedRecords[0];
        return sanitizedRecords[0];
    }
    
    @AuraEnabled
    public static QuoteForce__QuoteLineItem__c createNewSectionProductQuote(Id quoteId , Id sectionId) {
        QuoteForceSecurityUtil.assertCreateable(QuoteForce__QuoteLineItem__c.SObjectType);
        QuoteForce__QuoteLineItem__c newSection = new QuoteForce__QuoteLineItem__c(
            QuoteForce__Quotes__c = quoteId,
            QuoteForce__Type__c = 'Quote Product',
            QuoteForce__Product_Section__c = sectionId
        );
        List<QuoteForce__QuoteLineItem__c> sanitizedRecords = (List<QuoteForce__QuoteLineItem__c>) Security.stripInaccessible(
            AccessType.CREATABLE,
            new List<QuoteForce__QuoteLineItem__c>{ newSection }
        ).getRecords();
        insert as user sanitizedRecords[0];
        return sanitizedRecords[0];
    }
    
    @AuraEnabled
    public static QuoteForce__Invoice_line_items__c createNewSectionProductInvoice(Id invoiceId, Id sectionId) {
        QuoteForceSecurityUtil.assertCreateable(QuoteForce__Invoice_line_items__c.SObjectType);
        QuoteForce__Invoice_line_items__c newSection = new QuoteForce__Invoice_line_items__c(
            QuoteForce__Invoice__c = invoiceId,
            QuoteForce__Type__c = 'Invoice Product',
            QuoteForce__Section_Id__c = String.valueOf(sectionId)
        );
        List<QuoteForce__Invoice_line_items__c> sanitizedRecords = (List<QuoteForce__Invoice_line_items__c>) Security.stripInaccessible(
            AccessType.CREATABLE,
            new List<QuoteForce__Invoice_line_items__c>{ newSection }
        ).getRecords();
        insert as user sanitizedRecords[0];
        return sanitizedRecords[0];
    }
    
    @AuraEnabled
    public static QuoteForce__Product_Section__c updateProdSection(QuoteForce__Product_Section__c prod_sec_obj) {
        QuoteForceSecurityUtil.assertUpdateable(QuoteForce__Product_Section__c.SObjectType);
        List<QuoteForce__Product_Section__c> sanitizedRecords = (List<QuoteForce__Product_Section__c>) Security.stripInaccessible(
            AccessType.UPDATABLE,
            new List<QuoteForce__Product_Section__c>{ prod_sec_obj }
        ).getRecords();
        update as user sanitizedRecords[0];
        return sanitizedRecords[0];
    }
    
    @AuraEnabled
    public static QuoteForce__QuoteLineItem__c updateProdLineItms(QuoteForce__QuoteLineItem__c prod_lin_itms_obj) {
        QuoteForceSecurityUtil.assertUpdateable(QuoteForce__QuoteLineItem__c.SObjectType);
        if (prod_lin_itms_obj != null && prod_lin_itms_obj.Id != null) {
            Map<String, Object> populatedFields = prod_lin_itms_obj.getPopulatedFieldsAsMap();
            Boolean hasProductField = populatedFields.containsKey('QuoteForce__Product__c');
            if (hasProductField) {
                if (prod_lin_itms_obj.QuoteForce__Product__c == null) {
                    prod_lin_itms_obj.QuoteForce__Price_Book_Entry__c = null;
                    prod_lin_itms_obj.QuoteForce__ProductCode__c = null;
                    prod_lin_itms_obj.QuoteForce__Currency__c = null;
                } else {
                    QuoteForce__QuoteLineItem__c existingLine = [
                        SELECT Id, QuoteForce__Quotes__c, QuoteForce__Product__c
                        FROM QuoteForce__QuoteLineItem__c
                        WHERE Id = :prod_lin_itms_obj.Id WITH USER_MODE
                        LIMIT 1
                    ];
                    if (existingLine.QuoteForce__Quotes__c != null && prod_lin_itms_obj.QuoteForce__Product__c != existingLine.QuoteForce__Product__c) {
                        prod_lin_itms_obj.QuoteForce__Quotes__c = existingLine.QuoteForce__Quotes__c;
                        applyQuoteLineItemSnapshots(existingLine.QuoteForce__Quotes__c, new List<QuoteForce__QuoteLineItem__c>{ prod_lin_itms_obj }, true);
                    }
                }
            }
        }
        Id taxQuoteId = prod_lin_itms_obj != null ? prod_lin_itms_obj.QuoteForce__Quotes__c : null;
        if (taxQuoteId == null && prod_lin_itms_obj != null && prod_lin_itms_obj.Id != null) {
            List<QuoteForce__QuoteLineItem__c> existingLines = [
                SELECT Id, QuoteForce__Quotes__c
                FROM QuoteForce__QuoteLineItem__c
                WHERE Id = :prod_lin_itms_obj.Id WITH USER_MODE
                LIMIT 1
            ];
            taxQuoteId = existingLines.isEmpty() ? null : existingLines[0].QuoteForce__Quotes__c;
        }
        List<QuoteForce__QuoteLineItem__c> sanitizedRecords = (List<QuoteForce__QuoteLineItem__c>) Security.stripInaccessible(
            AccessType.UPDATABLE,
            new List<QuoteForce__QuoteLineItem__c>{ prod_lin_itms_obj }
        ).getRecords();
        update as user sanitizedRecords[0];
        return sanitizedRecords[0];
    }
    
    @AuraEnabled
    public static QuoteForce__QuoteLineItem__c insertProdLineItms(QuoteForce__QuoteLineItem__c prod_lin_itms_obj) {
        QuoteForceSecurityUtil.assertCreateable(QuoteForce__QuoteLineItem__c.SObjectType);
        if (prod_lin_itms_obj != null && prod_lin_itms_obj.QuoteForce__Quotes__c != null && prod_lin_itms_obj.QuoteForce__Product__c != null) {
            applyQuoteLineItemSnapshots(prod_lin_itms_obj.QuoteForce__Quotes__c, new List<QuoteForce__QuoteLineItem__c>{ prod_lin_itms_obj }, true);
        }
        List<QuoteForce__QuoteLineItem__c> sanitizedRecords = (List<QuoteForce__QuoteLineItem__c>) Security.stripInaccessible(
            AccessType.CREATABLE,
            new List<QuoteForce__QuoteLineItem__c>{ prod_lin_itms_obj }
        ).getRecords();
        insert as user sanitizedRecords[0];
        return sanitizedRecords[0];
    }
    
    @AuraEnabled(cacheable=false)
    public static List<QuoteForce__Product_Section__c> SectionUpdate(Id quoteId) {
        List<QuoteForce__Product_Section__c> sections = [
            SELECT Id,QuoteForce__Master_Template__c
            FROM QuoteForce__Product_Section__c
            WHERE QuoteForce__Master_Template__c = null
            AND QuoteForce__Quotes__c = null
            AND CreatedById = :UserInfo.getUserId() WITH USER_MODE
            ORDER BY CreatedDate ASC
        ];
        
        list<QuoteForce__Product_Section__c> psList= new list<QuoteForce__Product_Section__c>();
        
        for(QuoteForce__Product_Section__c ps:sections){
            QuoteForce__Product_Section__c psObj = New QuoteForce__Product_Section__c();
            psObj.Id =ps.Id;
            psObj.QuoteForce__Master_Template__c = quoteId;
            psList.add(psObj);
            
        }
        
        if (!psList.isEmpty()) {
            update as user psList;
        }
        
        List<QuoteForce__QuoteLineItem__c> orphanLineItems = [
            SELECT Id, QuoteForce__Master_Template__c
            FROM QuoteForce__QuoteLineItem__c
            WHERE QuoteForce__Master_Template__c = null
            AND QuoteForce__Quotes__c = null
            AND CreatedById = :UserInfo.getUserId()
            AND QuoteForce__Product_Section__c IN :new Map<Id, QuoteForce__Product_Section__c>(sections).keySet() WITH USER_MODE];
        
        if (!orphanLineItems.isEmpty()) {
            for (QuoteForce__QuoteLineItem__c lineItem : orphanLineItems) {
                lineItem.QuoteForce__Master_Template__c = quoteId;
            }
            update as user orphanLineItems;
        }
        
        return sections;
    }
    
    @AuraEnabled(cacheable=false)
    public static string SectionDeleteCancel() {
        List<QuoteForce__Product_Section__c> orphanSections = [
            SELECT Id
            FROM QuoteForce__Product_Section__c
            WHERE QuoteForce__Master_Template__c = null
            AND QuoteForce__Quotes__c = null
            AND CreatedById = :UserInfo.getUserId() WITH USER_MODE];
        
        Set<Id> orphanSectionIds = new Map<Id, QuoteForce__Product_Section__c>(orphanSections).keySet();
        
        List<QuoteForce__QuoteLineItem__c> children = [
            SELECT Id
            FROM QuoteForce__QuoteLineItem__c
            WHERE CreatedById = :UserInfo.getUserId()
            AND QuoteForce__Master_Template__c = null
            AND QuoteForce__Quotes__c = null
            AND (
                QuoteForce__Product_Section__c IN :orphanSectionIds
                OR QuoteForce__Type__c = 'Master Template Product'
            ) WITH USER_MODE];
        
        if (!children.isEmpty()) {
            delete as user children;
        }
        
        if (!orphanSections.isEmpty()) {
            delete as user orphanSections;
        }
        return 'Success';
    }
    
    public class InvoiceSectionItemWrapper {
        @AuraEnabled public Id itemId { get; set; }
        @AuraEnabled public Id productId { get; set; }
        @AuraEnabled public String productName { get; set; }
        @AuraEnabled public Id priceBookEntryId { get; set; }
        @AuraEnabled public String priceBookEntryName { get; set; }
        @AuraEnabled public Id priceBookId { get; set; }
        @AuraEnabled public String productCode { get; set; }
        @AuraEnabled public Decimal quantity { get; set; }
        @AuraEnabled public Decimal price { get; set; }
        @AuraEnabled public String unitOfMeasurement { get; set; }
    }
    
    public class InvoiceSectionWrapper {
        @AuraEnabled public Id sectionId { get; set; }
        @AuraEnabled public String sectionName { get; set; }
        @AuraEnabled public String notes { get; set; }
        @AuraEnabled public Id invoiceId { get; set; }
        @AuraEnabled public List<InvoiceSectionItemWrapper> lineItems { get; set; }
    }
    
    @AuraEnabled
    
    public static List<InvoiceSectionWrapper> getInvoiceSectionData(Id invoiceId) {
        
        List<QuoteForce__Product_Section__c> sections = [
            
            SELECT Id, Name, QuoteForce__Notes__c, QuoteForce__Invoice__c
            
            FROM QuoteForce__Product_Section__c
            
            WHERE QuoteForce__Invoice__c = :invoiceId WITH USER_MODE
            
            ORDER BY CreatedDate ASC
            
        ];
        
        
        
        Map<String, List<InvoiceSectionItemWrapper>> itemsBySectionId = new Map<String, List<InvoiceSectionItemWrapper>>();
        
        for (QuoteForce__Invoice_line_items__c item : [
            
            SELECT Id, QuoteForce__Product_Custom__c, QuoteForce__Product_Custom__r.Name, QuoteForce__Product_Custom__r.QuoteForce__Product_Code__c,
            QuoteForce__Quantity__c, QuoteForce__Price__c, QuoteForce__Unit_Of_Measurement__c, QuoteForce__Section_Id__c,
            QuoteForce__Price_Book_Entry__c, QuoteForce__Price_Book_Entry__r.Name, QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__c,
            QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.Name, QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.QuoteForce__Product_Code__c
            
            FROM QuoteForce__Invoice_line_items__c
            
            WHERE QuoteForce__Invoice__c = :invoiceId WITH USER_MODE
            
            ORDER BY CreatedDate ASC
            
        ]) {
            
            String sectionId = item.QuoteForce__Section_Id__c;
            
            if (!itemsBySectionId.containsKey(sectionId)) {
                
                itemsBySectionId.put(sectionId, new List<InvoiceSectionItemWrapper>());
                
            }
            
            
            
            InvoiceSectionItemWrapper wrappedItem = new InvoiceSectionItemWrapper();
            
            wrappedItem.itemId = item.Id;
            
            wrappedItem.productId = item.QuoteForce__Product_Custom__c;
            
            wrappedItem.productName = item.QuoteForce__Price_Book_Entry__r != null && item.QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r != null
                ? item.QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.Name
                : (item.QuoteForce__Product_Custom__r != null ? item.QuoteForce__Product_Custom__r.Name : null);
                    
                    wrappedItem.priceBookEntryId = item.QuoteForce__Price_Book_Entry__c;
            
            wrappedItem.priceBookEntryName = item.QuoteForce__Price_Book_Entry__r != null ? item.QuoteForce__Price_Book_Entry__r.Name : null;
            
            wrappedItem.priceBookId = item.QuoteForce__Price_Book_Entry__r != null ? item.QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__c : null;
            
            wrappedItem.productCode = item.QuoteForce__Price_Book_Entry__r != null && item.QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r != null
                ? item.QuoteForce__Price_Book_Entry__r.QuoteForce__Product__r.QuoteForce__Product_Code__c
                : (item.QuoteForce__Product_Custom__r != null ? item.QuoteForce__Product_Custom__r.QuoteForce__Product_Code__c : null);
                    
                    wrappedItem.quantity = item.QuoteForce__Quantity__c;
            
            wrappedItem.price = item.QuoteForce__Price__c;
            
            wrappedItem.unitOfMeasurement = item.QuoteForce__Unit_Of_Measurement__c;
            
            itemsBySectionId.get(sectionId).add(wrappedItem);
            
        }
        
        
        
        List<InvoiceSectionWrapper> wrappedSections = new List<InvoiceSectionWrapper>();
        
        for (QuoteForce__Product_Section__c section : sections) {
            
            InvoiceSectionWrapper wrappedSection = new InvoiceSectionWrapper();
            
            wrappedSection.sectionId = section.Id;
            
            wrappedSection.sectionName = section.Name;
            
            wrappedSection.notes = section.QuoteForce__Notes__c;
            
            wrappedSection.invoiceId = section.QuoteForce__Invoice__c;
            
            wrappedSection.lineItems = itemsBySectionId.containsKey(String.valueOf(section.Id))
                
                ? itemsBySectionId.get(String.valueOf(section.Id))
                
                : new List<InvoiceSectionItemWrapper>();
            
            wrappedSections.add(wrappedSection);
            
        }
        
        
        
        return wrappedSections;
        
    }
    
    
    
    @AuraEnabled
    
    public static QuoteForce__Invoice_line_items__c updateInvoiceLineItms(QuoteForce__Invoice_line_items__c invoiceLineItemObj) {
        QuoteForceSecurityUtil.assertUpdateable(QuoteForce__Invoice_line_items__c.SObjectType);
        if (invoiceLineItemObj != null && invoiceLineItemObj.Id != null) {
            Map<String, Object> populatedFields = invoiceLineItemObj.getPopulatedFieldsAsMap();
            Boolean hasProductField = populatedFields.containsKey('QuoteForce__Product_Custom__c');
            if (hasProductField) {
                if (invoiceLineItemObj.QuoteForce__Product_Custom__c == null) {
                    invoiceLineItemObj.QuoteForce__Price_Book_Entry__c = null;
                    invoiceLineItemObj.QuoteForce__ProductCode__c = null;
                    invoiceLineItemObj.QuoteForce__Currency__c = null;
                } else {
                    QuoteForce__Invoice_line_items__c existingLine = [
                        SELECT Id, QuoteForce__Invoice__c, QuoteForce__Product_Custom__c
                        FROM QuoteForce__Invoice_line_items__c
                        WHERE Id = :invoiceLineItemObj.Id WITH USER_MODE
                        LIMIT 1
                    ];
                    if (existingLine.QuoteForce__Invoice__c != null && invoiceLineItemObj.QuoteForce__Product_Custom__c != existingLine.QuoteForce__Product_Custom__c) {
                        invoiceLineItemObj.QuoteForce__Invoice__c = existingLine.QuoteForce__Invoice__c;
                        applyInvoiceLineItemSnapshots(existingLine.QuoteForce__Invoice__c, new List<QuoteForce__Invoice_line_items__c>{ invoiceLineItemObj }, true);
                    }
                }
            }
        }
        
        List<QuoteForce__Invoice_line_items__c> sanitizedRecords = (List<QuoteForce__Invoice_line_items__c>) Security.stripInaccessible(
            AccessType.UPDATABLE,
            new List<QuoteForce__Invoice_line_items__c>{ invoiceLineItemObj }
        ).getRecords();
        update as user sanitizedRecords[0];
        
        return sanitizedRecords[0];
        
    }
    
    
    
    @AuraEnabled
    
    public static QuoteForce__Invoice_line_items__c insertInvoiceLineItms(QuoteForce__Invoice_line_items__c invoiceLineItemObj) {
        QuoteForceSecurityUtil.assertCreateable(QuoteForce__Invoice_line_items__c.SObjectType);
        if (invoiceLineItemObj != null && invoiceLineItemObj.QuoteForce__Invoice__c != null && invoiceLineItemObj.QuoteForce__Product_Custom__c != null) {
            applyInvoiceLineItemSnapshots(invoiceLineItemObj.QuoteForce__Invoice__c, new List<QuoteForce__Invoice_line_items__c>{ invoiceLineItemObj }, true);
        }
        
        List<QuoteForce__Invoice_line_items__c> sanitizedRecords = (List<QuoteForce__Invoice_line_items__c>) Security.stripInaccessible(
            AccessType.CREATABLE,
            new List<QuoteForce__Invoice_line_items__c>{ invoiceLineItemObj }
        ).getRecords();
        insert as user sanitizedRecords[0];
        
        return sanitizedRecords[0];
        
    }
    
    
    
    @AuraEnabled
    public static void repriceQuoteLineItems(Id quoteId) {
        List<QuoteForce__QuoteLineItem__c> lineItems = [
            SELECT Id, QuoteForce__Quotes__c, QuoteForce__Quantity__c, QuoteForce__Product__c, QuoteForce__Price__c, QuoteForce__Currency__c, QuoteForce__ProductCode__c, QuoteForce__Price_Book_Entry__c
            FROM QuoteForce__QuoteLineItem__c
            WHERE QuoteForce__Quotes__c = :quoteId
            AND QuoteForce__Product__c != null WITH USER_MODE];
        if (lineItems.isEmpty()) {
            return;
        }
        applyQuoteLineItemSnapshots(quoteId, lineItems, true);
        update as user lineItems;
    }
    
    @AuraEnabled
    public static void repriceInvoiceLineItems(Id invoiceId) {
        List<QuoteForce__Invoice_line_items__c> lineItems = [
            SELECT Id, QuoteForce__Invoice__c, QuoteForce__Product_Custom__c, QuoteForce__Price__c, QuoteForce__Currency__c, QuoteForce__ProductCode__c, QuoteForce__Price_Book_Entry__c
            FROM QuoteForce__Invoice_line_items__c
            WHERE QuoteForce__Invoice__c = :invoiceId
            AND QuoteForce__Product_Custom__c != null WITH USER_MODE];
        if (lineItems.isEmpty()) {
            return;
        }
        applyInvoiceLineItemSnapshots(invoiceId, lineItems, true);
        update as user lineItems;
    }
    
    private static void applyQuoteLineItemSnapshots(Id quoteId, List<QuoteForce__QuoteLineItem__c> lineItems, Boolean overwriteUnitPrice) {
        
        if (lineItems == null || lineItems.isEmpty()) {
            
            return;
            
        }
        
        
        
        Set<Id> productIds = new Set<Id>();
        
        for (QuoteForce__QuoteLineItem__c lineItem : lineItems) {
            
            if (lineItem.QuoteForce__Product__c != null) {
                
                productIds.add(lineItem.QuoteForce__Product__c);
                
            }
            
        }
        
        
        
        Map<Id, QuoteForce__Product__c> productById = productIds.isEmpty()
            
            ? new Map<Id, QuoteForce__Product__c>()
            
            : new Map<Id, QuoteForce__Product__c>([
                
                SELECT Id, QuoteForce__Product_Code__c, QuoteForce__Default_Price__c, QuoteForce__Currency__c
                
                FROM QuoteForce__Product__c
                
                WHERE Id IN :productIds WITH USER_MODE]);
        
        Map<Id, QuoteForcePricingService.PricingResult> pricingByProduct =
            
            QuoteForcePricingService.resolveQuoteProductPricing(quoteId, productIds);
        
        Map<Id, QuoteForce__Price_Book_Entry__c> overrideEntryById = getPriceBookEntriesById(extractPriceBookEntryIds(lineItems));
        
        
        
        for (QuoteForce__QuoteLineItem__c lineItem : lineItems) {
            
            QuoteForcePricingService.PricingResult pricing = resolveQuoteLineItemPricing(
                lineItem,
                pricingByProduct.get(lineItem.QuoteForce__Product__c),
                overrideEntryById
            );
            
            QuoteForce__Product__c productRecord = productById.get(lineItem.QuoteForce__Product__c);
            
            applyQuoteSnapshot(lineItem, pricing, productRecord, overwriteUnitPrice);
            
        }
        
    }
    
    
    
    private static void applyInvoiceLineItemSnapshots(Id invoiceId, List<QuoteForce__Invoice_line_items__c> lineItems, Boolean overwriteUnitPrice) {
        
        if (lineItems == null || lineItems.isEmpty()) {
            
            return;
            
        }
        
        
        
        Set<Id> productIds = new Set<Id>();
        
        for (QuoteForce__Invoice_line_items__c lineItem : lineItems) {
            
            if (lineItem.QuoteForce__Product_Custom__c != null) {
                
                productIds.add(lineItem.QuoteForce__Product_Custom__c);
                
            }
            
        }
        
        
        
        Map<Id, QuoteForce__Product__c> productById = productIds.isEmpty()
            
            ? new Map<Id, QuoteForce__Product__c>()
            
            : new Map<Id, QuoteForce__Product__c>([
                
                SELECT Id, QuoteForce__Product_Code__c, QuoteForce__Default_Price__c, QuoteForce__Currency__c
                
                FROM QuoteForce__Product__c
                
                WHERE Id IN :productIds WITH USER_MODE]);
        
        Map<Id, QuoteForcePricingService.PricingResult> pricingByProduct =
            
            QuoteForcePricingService.resolveInvoiceProductPricing(invoiceId, productIds);
        
        Map<Id, QuoteForce__Price_Book_Entry__c> overrideEntryById = getPriceBookEntriesById(extractPriceBookEntryIds(lineItems));
        
        
        
        for (QuoteForce__Invoice_line_items__c lineItem : lineItems) {
            
            QuoteForcePricingService.PricingResult pricing = resolveInvoiceLineItemPricing(
                lineItem,
                pricingByProduct.get(lineItem.QuoteForce__Product_Custom__c),
                overrideEntryById
            );
            
            QuoteForce__Product__c productRecord = productById.get(lineItem.QuoteForce__Product_Custom__c);
            
            applyInvoiceSnapshot(lineItem, pricing, productRecord, overwriteUnitPrice);
            
        }
        
    }
    
    
    
    private static void applyQuoteSnapshot(
        
        QuoteForce__QuoteLineItem__c lineItem,
        
        QuoteForcePricingService.PricingResult pricing,
        
        QuoteForce__Product__c productRecord,
        
        Boolean overwriteUnitPrice
        
    ) {
        
        if (lineItem.QuoteForce__Product__c == null) {
            
            lineItem.QuoteForce__Price_Book_Entry__c = null;
            
            lineItem.QuoteForce__ProductCode__c = null;
            
            return;
            
        }
        
        
        
        lineItem.QuoteForce__Price_Book_Entry__c = pricing != null ? pricing.priceBookEntryId : null;
        
        lineItem.QuoteForce__ProductCode__c = pricing != null && String.isNotBlank(pricing.productCode)
            
            ? pricing.productCode
            
            : (productRecord != null ? productRecord.QuoteForce__Product_Code__c : null);
                
                if ((overwriteUnitPrice == true || lineItem.QuoteForce__Price__c == null) && pricing != null) {
                    lineItem.QuoteForce__Price__c = pricing.unitPrice;
                }
        
        if (overwriteUnitPrice == true || String.isBlank(lineItem.QuoteForce__Currency__c)) {
            lineItem.QuoteForce__Currency__c = pricing != null ? pricing.currencyCode : null;
        }
        
    }
    
    private static Set<Id> extractPriceBookEntryIds(List<QuoteForce__QuoteLineItem__c> lineItems) {
        Set<Id> priceBookEntryIds = new Set<Id>();
        for (QuoteForce__QuoteLineItem__c lineItem : lineItems) {
            if (lineItem.QuoteForce__Price_Book_Entry__c != null) {
                priceBookEntryIds.add(lineItem.QuoteForce__Price_Book_Entry__c);
            }
        }
        return priceBookEntryIds;
    }
    
    private static Set<Id> extractPriceBookEntryIds(List<QuoteForce__Invoice_line_items__c> lineItems) {
        Set<Id> priceBookEntryIds = new Set<Id>();
        for (QuoteForce__Invoice_line_items__c lineItem : lineItems) {
            if (lineItem.QuoteForce__Price_Book_Entry__c != null) {
                priceBookEntryIds.add(lineItem.QuoteForce__Price_Book_Entry__c);
            }
        }
        return priceBookEntryIds;
    }
    
    private static Map<Id, QuoteForce__Price_Book_Entry__c> getPriceBookEntriesById(Set<Id> priceBookEntryIds) {
        return priceBookEntryIds.isEmpty()
            ? new Map<Id, QuoteForce__Price_Book_Entry__c>()
            : new Map<Id, QuoteForce__Price_Book_Entry__c>([
                SELECT Id, QuoteForce__Price_Book__c, QuoteForce__Product__c, QuoteForce__Product_Code__c, QuoteForce__Currency__c, QuoteForce__Unit_Price__c
                FROM QuoteForce__Price_Book_Entry__c
                WHERE Id IN :priceBookEntryIds WITH USER_MODE]);
    }
    
    private static QuoteForcePricingService.PricingResult resolveQuoteLineItemPricing(
        QuoteForce__QuoteLineItem__c lineItem,
        QuoteForcePricingService.PricingResult fallbackPricing,
        Map<Id, QuoteForce__Price_Book_Entry__c> overrideEntryById
    ) {
        if (lineItem == null || lineItem.QuoteForce__Price_Book_Entry__c == null) {
            return fallbackPricing;
        }
        
        QuoteForce__Price_Book_Entry__c overrideEntry = overrideEntryById.get(lineItem.QuoteForce__Price_Book_Entry__c);
        if (overrideEntry == null || overrideEntry.QuoteForce__Product__c != lineItem.QuoteForce__Product__c) {
            return fallbackPricing;
        }
        
        return buildPricingResultFromEntry(lineItem.QuoteForce__Product__c, overrideEntry);
    }
    
    private static QuoteForcePricingService.PricingResult resolveInvoiceLineItemPricing(
        QuoteForce__Invoice_line_items__c lineItem,
        QuoteForcePricingService.PricingResult fallbackPricing,
        Map<Id, QuoteForce__Price_Book_Entry__c> overrideEntryById
    ) {
        if (lineItem == null || lineItem.QuoteForce__Price_Book_Entry__c == null) {
            return fallbackPricing;
        }
        
        QuoteForce__Price_Book_Entry__c overrideEntry = overrideEntryById.get(lineItem.QuoteForce__Price_Book_Entry__c);
        if (overrideEntry == null || overrideEntry.QuoteForce__Product__c != lineItem.QuoteForce__Product_Custom__c) {
            return fallbackPricing;
        }
        
        return buildPricingResultFromEntry(lineItem.QuoteForce__Product_Custom__c, overrideEntry);
    }
    
    private static QuoteForcePricingService.PricingResult buildPricingResultFromEntry(Id productId, QuoteForce__Price_Book_Entry__c priceBookEntry) {
        QuoteForcePricingService.PricingResult pricing = new QuoteForcePricingService.PricingResult();
        pricing.productId = productId;
        pricing.priceBookId = priceBookEntry.QuoteForce__Price_Book__c;
        pricing.priceBookEntryId = priceBookEntry.Id;
        pricing.unitPrice = priceBookEntry.QuoteForce__Unit_Price__c;
        pricing.currencyCode = priceBookEntry.QuoteForce__Currency__c;
        pricing.productCode = priceBookEntry.QuoteForce__Product_Code__c;
        return pricing;
    }
    
    
    
    private static void applyInvoiceSnapshot(
        
        QuoteForce__Invoice_line_items__c lineItem,
        
        QuoteForcePricingService.PricingResult pricing,
        
        QuoteForce__Product__c productRecord,
        
        Boolean overwriteUnitPrice
        
    ) {
        
        if (lineItem.QuoteForce__Product_Custom__c == null) {
            
            lineItem.QuoteForce__Price_Book_Entry__c = null;
            
            lineItem.QuoteForce__ProductCode__c = null;
            
            return;
            
        }
        
        
        
        lineItem.QuoteForce__Price_Book_Entry__c = pricing != null ? pricing.priceBookEntryId : null;
        
        lineItem.QuoteForce__ProductCode__c = pricing != null && String.isNotBlank(pricing.productCode)
            
            ? pricing.productCode
            
            : (productRecord != null ? productRecord.QuoteForce__Product_Code__c : null);
                
                if ((overwriteUnitPrice == true || lineItem.QuoteForce__Price__c == null) && pricing != null) {
                    lineItem.QuoteForce__Price__c = pricing.unitPrice;
                }
        
        if (overwriteUnitPrice == true || String.isBlank(lineItem.QuoteForce__Currency__c)) {
            lineItem.QuoteForce__Currency__c = pricing != null ? pricing.currencyCode : null;
        }
        
    }
    
    
    
    private static String resolveInvoiceSnapshotCurrency(Id invoiceId) {
        
        if (invoiceId == null) {
            
            return null;
            
        }
        
        
        
        List<QuoteForce__Invoice__c> invoices = [
            
            SELECT Id, QuoteForce__Price_Book__r.QuoteForce__Currency__c, QuoteForce__Quotes__r.QuoteForce__Currency__c
            
            FROM QuoteForce__Invoice__c
            
            WHERE Id = :invoiceId WITH USER_MODE
            
            LIMIT 1
            
        ];
        
        if (invoices.isEmpty()) {
            
            return null;
            
        }
        
        
        
        QuoteForce__Invoice__c invoiceRecord = invoices[0];
        
        if (invoiceRecord.QuoteForce__Price_Book__r != null && String.isNotBlank(invoiceRecord.QuoteForce__Price_Book__r.QuoteForce__Currency__c)) {
            
            return invoiceRecord.QuoteForce__Price_Book__r.QuoteForce__Currency__c;
            
        }
        
        return invoiceRecord.QuoteForce__Quotes__r != null ? invoiceRecord.QuoteForce__Quotes__r.QuoteForce__Currency__c : null;
        
    }
    
    
    
    @AuraEnabled
    public static void deleteInvoiceLineItem(Id itemId) {
        QuoteForceSecurityUtil.assertDeletable(QuoteForce__Invoice_line_items__c.SObjectType);
        
        QuoteForce__Invoice_line_items__c item = [SELECT Id FROM QuoteForce__Invoice_line_items__c WHERE Id = :itemId WITH USER_MODE LIMIT 1];
        
        delete as user item;
        
    }
    
    @AuraEnabled(cacheable=false)
    public static void deleteInvoiceSection(Id sectionId) {
        QuoteForceSecurityUtil.assertDeletable(QuoteForce__Invoice_line_items__c.SObjectType);
        QuoteForceSecurityUtil.assertDeletable(QuoteForce__Product_Section__c.SObjectType);
        List<QuoteForce__Invoice_line_items__c> children = [
            SELECT Id
            FROM QuoteForce__Invoice_line_items__c
            WHERE QuoteForce__Section_Id__c = :String.valueOf(sectionId) WITH USER_MODE];
        if (!children.isEmpty()) {
            delete as user children;
        }
        
        delete as user [SELECT Id FROM QuoteForce__Product_Section__c WHERE Id = :sectionId WITH USER_MODE LIMIT 1];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<QuoteForce__Price_Book__c> listPriceBooks(
        String searchKey,
        String currencyFilter,
        Boolean activeOnly
    ) {
        
        if(String.isNotBlank(currencyFilter)){
            
            return [
                SELECT Id, Name, QuoteForce__Currency__c
                FROM QuoteForce__Price_Book__c
                WHERE QuoteForce__Currency__c = :currencyFilter WITH USER_MODE
                ORDER BY Name LIMIT 200
            ];
        }
        
        return [
            SELECT Id, Name, QuoteForce__Currency__c
            FROM QuoteForce__Price_Book__c WITH USER_MODE
            ORDER BY Name LIMIT 200
        ];
    }
    
}