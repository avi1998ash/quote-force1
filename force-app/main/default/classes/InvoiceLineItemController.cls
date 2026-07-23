public with sharing class InvoiceLineItemController {
    
    @AuraEnabled
    public static QuoteForce__Invoice__c getInvoiceDetails(String recordId) {
        QuoteForce__Invoice__c invlist = [
            SELECT  Id, Name,  QuoteForce__Date__c, 
            QuoteForce__Expiration_Date__c, QuoteForce__First_Name__c,
            QuoteForce__Last_Name__c, QuoteForce__Layout_Name__c, QuoteForce__LayoutId__c, 
            QuoteForce__Letter_from_the_owner__c, QuoteForce__Opportunity__c, QuoteForce__Pages_JSON__c,
            QuoteForce__Primary_Image__c, QuoteForce__Quotes__c, QuoteForce__Quotes_Name__c, 
            QuoteForce__Untitled_spreadsheet_Untitled_spreadshe__c, 
            QuoteForce__State_Province__c, QuoteForce__Status__c, QuoteForce__Street_Address__c, QuoteForce__Tax__c,
            QuoteForce__Terms_Conditions__c, QuoteForce__Warranty__c, QuoteForce__Zip_code_Postal_code__c,
            QuoteForce__Price_Book__c, QuoteForce__Ship_To__Street__s, QuoteForce__Ship_To__City__s, QuoteForce__Ship_To__PostalCode__s, 
            QuoteForce__Ship_To__StateCode__s, QuoteForce__Ship_To__CountryCode__s, QuoteForce__Ship_To__Latitude__s, QuoteForce__Ship_To__Longitude__s,
            QuoteForce__Ship_To__GeocodeAccuracy__s, QuoteForce__Ship_To__c, QuoteForce__Bill_To__Street__s, QuoteForce__Bill_To__City__s, QuoteForce__Bill_To__PostalCode__s, 
            QuoteForce__Bill_To__StateCode__s, QuoteForce__Bill_To__CountryCode__s, QuoteForce__Bill_To__Latitude__s, QuoteForce__Bill_To__Longitude__s,
            QuoteForce__Bill_To__GeocodeAccuracy__s,
            QuoteForce__Bill_To__c, QuoteForce__Secondary_Image__c FROM QuoteForce__Invoice__c  WHERE Id = :recordId WITH USER_MODE LIMIT 1
        ];
        
        System.debug('invlist'+invlist);
        return invlist;
    }
    
    @AuraEnabled
    public static QuoteForce__Master_Template__c CreateMasterLayout(QuoteForce__Master_Template__c mstLayoutObj){
        
        try {
            insert as user mstLayoutObj;  
        } catch (Exception e) {
            system.debug('e- - - -  - - - -:'+e);
        }
        return mstLayoutObj;
    }
    
    
    @AuraEnabled
    public static QuoteForce__Custom_Page__c CreateCustomPage(QuoteForce__Custom_Page__c customObj){
        
        try {
            insert as user customObj;  
        } catch (Exception e) {
            system.debug('e- - - -  - - - -:'+e);
        }
        return customObj;
    }
    
    @AuraEnabled
    public static QuoteForce__Custom_Page__c updateCustomPage(QuoteForce__Custom_Page__c customObj){
        
        try {
            update as user customObj;  
        } catch (Exception e) {
            system.debug('e- - - -  - - - -:'+e);
        }
        return customObj;
    }
    
    @AuraEnabled
    public static List<QuoteForce__Custom_Page__c> getCustomPage(string recordId) {
        return [SELECT Id, Name, QuoteForce__label__c, QuoteForce__selected__c, QuoteForce__editMode__c, QuoteForce__Text_Page__c,
                QuoteForce__toggle__c, QuoteForce__Master_Template__c, QuoteForce__Type__c,
                (SELECT ContentDocumentId, ContentDocument.LatestPublishedVersionId,ContentDocument.Title
                 FROM ContentDocumentLinks)
                FROM QuoteForce__Custom_Page__c 
                where QuoteForce__Master_Template__c =: recordId WITH USER_MODE];
    }
    
    @AuraEnabled
    public static List<QuoteForce__Custom_Page__c> getCustomPageQuote(string recordId) {
        return [SELECT Id, Name, QuoteForce__label__c, QuoteForce__selected__c, QuoteForce__editMode__c, QuoteForce__Text_Page__c, QuoteForce__Quotes__c,
                QuoteForce__toggle__c, QuoteForce__Master_Template__c, QuoteForce__Type__c,
                (SELECT ContentDocumentId, ContentDocument.LatestPublishedVersionId,ContentDocument.Title
                 FROM ContentDocumentLinks)
                FROM QuoteForce__Custom_Page__c 
                where QuoteForce__Quotes__c =: recordId WITH USER_MODE];
    }
    
    @AuraEnabled
    public static List<QuoteForce__Custom_Page__c> getCustomPageInvoice(string recordId) {
        return [SELECT Id, Name, QuoteForce__label__c, QuoteForce__selected__c, QuoteForce__editMode__c, QuoteForce__Text_Page__c, QuoteForce__Quotes__c, QuoteForce__Invoice__c,
                QuoteForce__toggle__c, QuoteForce__Master_Template__c, QuoteForce__Type__c,
                (SELECT ContentDocumentId, ContentDocument.LatestPublishedVersionId,ContentDocument.Title
                 FROM ContentDocumentLinks)
                FROM QuoteForce__Custom_Page__c
                WHERE QuoteForce__Invoice__c = :recordId WITH USER_MODE];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<QuoteForce__Master_Template__c> getLayouts() {
        return [SELECT Id, QuoteForce__Layout_Name__c, QuoteForce__Date__c, QuoteForce__First_Name__c, QuoteForce__Last_Name__c, 
                QuoteForce__Street_Address__c, QuoteForce__City__c, QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c, QuoteForce__Pages_JSON__c,
                QuoteForce__Letter_from_the_owner__c, QuoteForce__IsDefault__c FROM QuoteForce__Master_Template__c WITH USER_MODE  ORDER BY CreatedDate DESC  LIMIT 1];
    }
    
    @AuraEnabled
    public static List<QuoteForce__Master_Template__c> getLayoutSearch(String searchKey) {
        String searchTerm = '%' + String.escapeSingleQuotes(searchKey) + '%';
        return [SELECT Id, QuoteForce__Layout_Name__c, QuoteForce__Date__c, QuoteForce__First_Name__c, QuoteForce__Last_Name__c, 
                QuoteForce__Street_Address__c, QuoteForce__City__c, QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c, QuoteForce__Pages_JSON__c,
                QuoteForce__Letter_from_the_owner__c, QuoteForce__IsDefault__c FROM QuoteForce__Master_Template__c WHERE QuoteForce__Layout_Name__c LIKE :searchTerm WITH USER_MODE ORDER BY CreatedDate DESC];
    }
    
    
    @AuraEnabled
    public static QuoteForce__Master_Template__c getLayoutRecord(String mtId) {
        QuoteForce__Master_Template__c mt = [
            SELECT Id, QuoteForce__Layout_Name__c, QuoteForce__Date__c, QuoteForce__First_Name__c, QuoteForce__Last_Name__c,
            QuoteForce__Street_Address__c, QuoteForce__City__c, QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c,
            QuoteForce__Letter_from_the_owner__c,
            QuoteForce__Primary_Image__c, QuoteForce__Secondary_Image__c, QuoteForce__Pages_JSON__c, QuoteForce__Warranty_Doc__c, QuoteForce__Terms_Condition_doc__c,
            (SELECT ContentDocumentId, ContentDocument.LatestPublishedVersionId,ContentDocument.Title, LinkedEntityId
             FROM ContentDocumentLinks)
            FROM QuoteForce__Master_Template__c 
            WHERE Id =: mtId WITH USER_MODE
            LIMIT 1
        ];
        return mt;
    }

    @AuraEnabled
    public static void attachDocsToQuote(Id quoteId, Id primaryDocId, Id secondaryDocId, Id warrantyDocId, Id termConDocId) {
        List<ContentDocumentLink> linksToInsert = new List<ContentDocumentLink>();
        
        if (primaryDocId != null) {
            linksToInsert.add(new ContentDocumentLink(
                ContentDocumentId = primaryDocId,
                LinkedEntityId = quoteId,
                ShareType = 'V', // Viewer access
                Visibility = 'AllUsers'
            ));
        }
        
        if (secondaryDocId != null) {
            linksToInsert.add(new ContentDocumentLink(
                ContentDocumentId = secondaryDocId,
                LinkedEntityId = quoteId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            ));
        }
        
        if (warrantyDocId != null) {
            linksToInsert.add(new ContentDocumentLink(
                ContentDocumentId = warrantyDocId,
                LinkedEntityId = quoteId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            ));
        }
        
        if (termConDocId != null) {
            linksToInsert.add(new ContentDocumentLink(
                ContentDocumentId = termConDocId,
                LinkedEntityId = quoteId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            ));
        }
        
        if (!linksToInsert.isEmpty()) {
            insert as user linksToInsert;
        }
    }
    
    @AuraEnabled
    public static QuoteForce__Invoice__c getQuoteDocumentLinks(String quoteId) {
        return [
            SELECT Id,
            (SELECT ContentDocumentId, ContentDocument.LatestPublishedVersionId, ContentDocument.Title
             FROM ContentDocumentLinks)
            FROM QuoteForce__Invoice__c
            WHERE Id = :quoteId WITH USER_MODE
            LIMIT 1
        ];
    }
    
    
    
    @AuraEnabled
    public static void updateInvoiceDetails(
        Id quoteId,
        String firstName,
        String lastName,
        String streetAddress,
        String city,
        String stateProvince,
        String zipCode,
        String layoutName,
        Date CreatedDate,
        String letterForm,
        string pagesJSON,
        Id priceBookId
        
    ) {
        if (String.isBlank(quoteId)) return;
        
        QuoteForce__Invoice__c quote = [SELECT Id, QuoteForce__First_Name__c, QuoteForce__Last_Name__c, QuoteForce__Street_Address__c, QuoteForce__City__c, QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c, QuoteForce__Date__c, QuoteForce__Layout_Name__c, QuoteForce__Letter_from_the_owner__c, QuoteForce__Pages_JSON__c, QuoteForce__Price_Book__c FROM QuoteForce__Invoice__c WHERE Id = :quoteId WITH USER_MODE LIMIT 1];
        
        if (firstName != null) quote.QuoteForce__First_Name__c = firstName;
        if (lastName != null) quote.QuoteForce__Last_Name__c = lastName;
        if (pagesJSON != null) quote.QuoteForce__Pages_JSON__c = pagesJSON;
        if (streetAddress != null) quote.QuoteForce__Street_Address__c = streetAddress;
        if (city != null) quote.QuoteForce__City__c = city;
        if (stateProvince != null) quote.QuoteForce__State_Province__c = stateProvince;
        if (zipCode != null) quote.QuoteForce__Zip_code_Postal_code__c = zipCode;
        if (layoutName != null) quote.QuoteForce__Layout_Name__c = layoutName;
        if (CreatedDate != null) quote.QuoteForce__Date__c = CreatedDate;
        if (letterForm != null) quote.QuoteForce__Letter_from_the_owner__c = letterForm;
        quote.QuoteForce__Price_Book__c = priceBookId;
        
        update as user quote;
    }
    
    @AuraEnabled(cacheable=false)
    public static Id uploadFile(String base64Data, String fileName, Id parentId) {
        try {
            ContentVersion contentVersion = new ContentVersion();
            contentVersion.VersionData = EncodingUtil.base64Decode(base64Data);
            contentVersion.Title = fileName;
            contentVersion.PathOnClient = '/' + fileName;
            insert as user contentVersion;
            
            // Get ContentDocumentId
            ContentVersion insertedContentVersion = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :contentVersion.Id WITH USER_MODE LIMIT 1];
            
            // Now create ContentDocumentLink to link it to Quotes__c record
            ContentDocumentLink cdl = new ContentDocumentLink();
            cdl.ContentDocumentId = insertedContentVersion.ContentDocumentId;
            cdl.LinkedEntityId = parentId; // Your QuoteForce__Quotes__c record Id
            cdl.ShareType = 'V'; // View permission
            insert as user cdl;
            
            return insertedContentVersion.ContentDocumentId;
        } catch (Exception ex) {
            throw new AuraHandledException('Error uploading file: ' + ex.getMessage());
        }
    }
    
    @AuraEnabled
    public static Map<String, Id> uploadFileQuote(String base64Data, String fileName, Id parentId) {
        try {
            ContentVersion contentVersion = new ContentVersion();
            contentVersion.VersionData = EncodingUtil.base64Decode(base64Data);
            contentVersion.Title = fileName;
            contentVersion.PathOnClient = '/' + fileName;
            insert as user contentVersion;
            
            ContentVersion insertedCV = [
                SELECT Id, ContentDocumentId, ContentDocument.LatestPublishedVersionId
                FROM ContentVersion
                WHERE Id = :contentVersion.Id WITH USER_MODE
                LIMIT 1
            ];
            
            ContentDocumentLink cdl = new ContentDocumentLink();
            cdl.ContentDocumentId = insertedCV.ContentDocumentId;
            cdl.LinkedEntityId = parentId;
            cdl.ShareType = 'V';
            insert as user cdl;
            
            return new Map<String, Id>{
                'documentId' => insertedCV.ContentDocumentId, 
                    'versionId'  => insertedCV.Id,               
                    'latestVersionId' => insertedCV.ContentDocument.LatestPublishedVersionId 
                    };
                        } catch (Exception ex) {
                            throw new AuraHandledException('Error uploading file: ' + ex.getMessage());
                        }
    }
    
    
    @AuraEnabled
    public static void deleteQuoteFile(String contentDocumentId, String quoteId) {
        List<ContentDocumentLink> links = [
            SELECT Id 
            FROM ContentDocumentLink 
            WHERE ContentDocumentId = :contentDocumentId 
            AND LinkedEntityId = :quoteId WITH USER_MODE
        ];
        
        if (!links.isEmpty()) {
            delete as user links;
        }
    }
    
    
    @AuraEnabled
    public static void deleteFile(Id contentDocumentId) {
        try {
            System.debug('ContentDocumentId to delete: ' + contentDocumentId);
            delete as user [SELECT Id FROM ContentDocument WHERE Id = :contentDocumentId WITH USER_MODE];
        } catch (Exception e) {
            System.debug('Failed to delete as user ContentDocument: ' + e.getMessage());
            throw new AuraHandledException('Failed to delete as user the image: ' + e.getMessage());
        }
    }
    
    // Update
    @AuraEnabled
    public static QuoteForce__Master_Template__c UpdateMasterLayout(QuoteForce__Master_Template__c mstLayoutObj){
        try {
            if (mstLayoutObj.Id != null) {
                update as user mstLayoutObj;
            }
        } catch (Exception e) {
            System.debug('Exception: ' + e);
        }
        return mstLayoutObj;
    }

    @AuraEnabled
    public static void makeDefault(String layoutId) {
        try {
            // Step 1: Set all layouts to false
            List<QuoteForce__Master_Template__c> layouts = [SELECT Id, QuoteForce__IsDefault__c FROM QuoteForce__Master_Template__c WHERE QuoteForce__IsDefault__c = true WITH USER_MODE];
            for (QuoteForce__Master_Template__c layout : layouts) {
                layout.QuoteForce__IsDefault__c = false;
            }
            update as user layouts;
            
            // Step 2: Set the selected layout to true
            QuoteForce__Master_Template__c defaultLayout = [SELECT Id FROM QuoteForce__Master_Template__c WHERE Id = :layoutId WITH USER_MODE LIMIT 1];
            defaultLayout.QuoteForce__IsDefault__c = true;
            update as user defaultLayout;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to set default layout: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static void deleteLayout(Id layoutId) {
        // Find related ContentDocumentLink records
        List<ContentDocumentLink> links = [
            SELECT ContentDocumentId 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId = :layoutId WITH USER_MODE];
        
        // Collect ContentDocumentIds
        Set<Id> documentIds = new Set<Id>();
        for (ContentDocumentLink link : links) {
            documentIds.add(link.ContentDocumentId);
        }
        
        // delete as user the links (optional if you delete as user the document)
        delete as user links;
        
        // Optionally delete as user the documents themselves
        if (!documentIds.isEmpty()) {
            List<ContentDocument> docs = [SELECT Id FROM ContentDocument WHERE Id IN :documentIds WITH USER_MODE];
            delete as user docs;
        }
        
        // Finally delete as user the layout
        QuoteForce__Master_Template__c layoutToDelete = [SELECT Id FROM QuoteForce__Master_Template__c  WHERE Id = :layoutId WITH USER_MODE LIMIT 1];
        delete as user layoutToDelete;
    }
    
    @AuraEnabled(cacheable=false)
    public static void deleteLayoutPage(Id layoutId) {
        // Find related ContentDocumentLink records
        List<ContentDocumentLink> links = [
            SELECT ContentDocumentId 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId = :layoutId WITH USER_MODE];
        
        // Collect ContentDocumentIds
        Set<Id> documentIds = new Set<Id>();
        for (ContentDocumentLink link : links) {
            documentIds.add(link.ContentDocumentId);
        }
        
        // delete as user the links (optional if you delete as user the document)
        delete as user links;
        
        // Optionally delete as user the documents themselves
        if (!documentIds.isEmpty()) {
            List<ContentDocument> docs = [SELECT Id FROM ContentDocument WHERE Id IN :documentIds WITH USER_MODE];
            delete as user docs;
        }
        
        // Finally delete as user the layout
        QuoteForce__Custom_Page__c layoutToDelete = [SELECT Id FROM QuoteForce__Custom_Page__c  WHERE Id = :layoutId WITH USER_MODE LIMIT 1];
        delete as user layoutToDelete;
    }
    
    @AuraEnabled(cacheable=false)
    public static String uploadBulkFiles(String filesJson, String recId){
        System.debug('## in the method'+ filesJson);
        System.debug('## recId'+ recId);
        try{
            if(String.isNotBlank(filesJson)){
                List<String> recordIds = new List<String>();
                List<fileWrapper> files = (List<fileWrapper>) System.json.deserialize(filesJson, List<fileWrapper>.class);
                
                List<ContentVersion> cvListToInsert = new List<ContentVersion>();
                
                for(fileWrapper fl: files){
                    recordIds.add(fl.recordId);
                    ContentVersion cv = new ContentVersion();
                    cv.VersionData = EncodingUtil.base64Decode(fl.base64);
                    cv.Title = fl.filename;
                    cv.PathOnClient = fl.filename;
                    cvListToInsert.add(cv);
                }
                
                if(!cvListToInsert.isEmpty()){
                    insert as user cvListToInsert;
                    
                    List<ContentVersion> cvList =  [SELECT ContentDocumentId FROM ContentVersion WHERE Id IN : cvListToInsert WITH USER_MODE];
                    
                    List<ContentDocumentLink> contDocLinkList = new List<ContentDocumentLink>();
                    integer i = 0;
                    for(ContentVersion cv: cvList){
                        String recordId = recordIds[i];
                        ContentDocumentLink cdl = new ContentDocumentLink();
                        cdl.ContentDocumentId = cv.ContentDocumentId;
                        cdl.LinkedEntityId = (String.isNotBlank(recId))? recId : recordId;
                        cdl.ShareType = 'V';
                        contDocLinkList.add(cdl);
                        i++;
                    }
                    
                    if(!contDocLinkList.isEmpty()){
                        insert as user contDocLinkList;
                        System.debug('## in the second if: '+ contDocLinkList);
                    }
                }
            }else{
                throw new auraHandledException('Didn\'t Find Any File To Upload.');
            }
            return 'done';
        }catch(Exception ex){
            throw new auraHandledException(ex.getMessage());
        }
        
    }
    
    // wrapper class to get all the files in the bulk
    public class fileWrapper{
        public String filename;	
        public String base64;
        public String recordId;	
    }
    
    @AuraEnabled
    public static void saveImageUrl(Id recordId, String fieldName, String fileUrl) {
        if (String.isNotBlank(recordId) && String.isNotBlank(fieldName)) {
            QuoteForce__Invoice__c quoteRecord = new QuoteForce__Invoice__c(Id = recordId);
            quoteRecord.put(QuoteForceSecurityUtil.normalizeLocalApiName(fieldName), fileUrl); 
            update as user quoteRecord;
        }
    }
    
}