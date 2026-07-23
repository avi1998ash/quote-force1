public with sharing class createMasterTemplateRecord {
    
    @AuraEnabled
    public static QuoteForce__Master_Template__c CreateMasterLayout(
        QuoteForce__Master_Template__c mstLayoutObj
    ) {
        System.debug('create master template    :'+mstLayoutObj);
        try {
            if (mstLayoutObj == null) {
                throw new AuraHandledException('Invalid input: layout object is null.');
            }

            if (!Schema.sObjectType.QuoteForce__Master_Template__c.isCreateable()) {
                throw new AuraHandledException('You do not have permission to create Master Template records.');
            }

            List<QuoteForce__Master_Template__c> sanitizedRecords =
                (List<QuoteForce__Master_Template__c>) Security.stripInaccessible(
                    AccessType.CREATABLE,
                    new List<QuoteForce__Master_Template__c>{ mstLayoutObj }
                ).getRecords();

            QuoteForce__Master_Template__c recordToInsert = sanitizedRecords[0].clone(false, false, false, false);

            insert as user recordToInsert;

            return recordToInsert;
        } catch (Exception e) {
            System.debug('@@@ CreateMasterLayout failed: ' + e.getMessage());
            throw new AuraHandledException(
                'Failed to create Master Template: ' + e.getMessage()
            );
        }
    }
    
    @AuraEnabled
    public static QuoteForce__Quotes__c getQuoteDetails(String recordId) {
        QuoteForce__Quotes__c quotelist = [
            SELECT Name, QuoteForce__Expiration_Date__c, QuoteForce__Status__c, QuoteForce__Tax__c, 
            QuoteForce__Currency__c, QuoteForce__Price_Book__c, QuoteForce__Pages_JSON__c,
            QuoteForce__Terms_Conditions__c, QuoteForce__Warranty__c, QuoteForce__Primary_Image__c, 
            QuoteForce__Secondary_Image__c,
            QuoteForce__Bill_To__Street__s, QuoteForce__Bill_To__City__s, QuoteForce__Bill_To__StateCode__s, 
            QuoteForce__Bill_To__PostalCode__s, QuoteForce__Bill_To__CountryCode__s, 
            QuoteForce__Ship_To__Street__s, QuoteForce__Ship_To__City__s, QuoteForce__Ship_To__StateCode__s, 
            QuoteForce__Ship_To__PostalCode__s, QuoteForce__Ship_To__CountryCode__s,
            QuoteForce__First_Name__c, QuoteForce__Last_Name__c, QuoteForce__Layout_Name__c, 
            QuoteForce__Street_Address__c, QuoteForce__City__c, QuoteForce__State_Province__c, 
            QuoteForce__Zip_code_Postal_code__c, QuoteForce__Date__c, QuoteForce__Letter_from_the_owner__c 
            FROM QuoteForce__Quotes__c WHERE Id = :recordId WITH USER_MODE
        ];
        System.debug('quotelist'+quotelist);
        return quotelist;
    }
   
    @AuraEnabled
    public static QuoteForce__Custom_Page__c CreateCustomPage(
        String name,
        String label,
        Id masterTemplateId, String quoteId
    ) {
        try {

            QuoteForce__Custom_Page__c page = new QuoteForce__Custom_Page__c();
            
            page.Name = name;
            page.QuoteForce__label__c = label;
            page.QuoteForce__selected__c = false;
            page.QuoteForce__editMode__c = false;
            page.QuoteForce__toggle__c = false;
            page.QuoteForce__Master_Template__c = masterTemplateId;
            page.QuoteForce__Quotes__c = quoteId;

            SObjectAccessDecision decision =
                Security.stripInaccessible(
                    AccessType.CREATABLE,
                    new List<QuoteForce__Custom_Page__c>{page}
                );
            QuoteForce__Custom_Page__c sanitizedPage =
                (QuoteForce__Custom_Page__c)decision.getRecords()[0];

            insert as user sanitizedPage;

            return sanitizedPage;

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    @AuraEnabled
    public static QuoteForce__Custom_Page__c updateCustomPage(QuoteForce__Custom_Page__c customObj){
        try {
            List<QuoteForce__Custom_Page__c> sanitizedRecords = (List<QuoteForce__Custom_Page__c>) Security.stripInaccessible(
                AccessType.UPDATABLE,
                new List<QuoteForce__Custom_Page__c>{ customObj }
            ).getRecords();
            update as user sanitizedRecords[0];
            customObj = sanitizedRecords[0];
        } catch (Exception e) {
            system.debug('e- - - -  - - - -:'+e);
        }
        return customObj;
    }
    
    @AuraEnabled
    public static List<QuoteForce__Custom_Page__c> getCustomPage(string recordId) {
        return [SELECT Id, Name, QuoteForce__label__c, QuoteForce__selected__c, QuoteForce__editMode__c, 
                QuoteForce__Text_Page__c, QuoteForce__toggle__c, QuoteForce__Master_Template__c, QuoteForce__Type__c,
                (SELECT ContentDocumentId, ContentDocument.LatestPublishedVersionId, ContentDocument.Title
                 FROM ContentDocumentLinks)
                FROM QuoteForce__Custom_Page__c 
                WHERE QuoteForce__Master_Template__c =: recordId WITH USER_MODE];
    }
    
    @AuraEnabled
    public static List<QuoteForce__Custom_Page__c> getCustomPageQuote(string recordId) {
        return [SELECT Id, Name, QuoteForce__label__c, QuoteForce__selected__c, QuoteForce__editMode__c, 
                QuoteForce__Text_Page__c, QuoteForce__Quotes__c, QuoteForce__toggle__c, 
                QuoteForce__Master_Template__c, QuoteForce__Type__c,
                (SELECT ContentDocumentId, ContentDocument.LatestPublishedVersionId, ContentDocument.Title
                 FROM ContentDocumentLinks)
                FROM QuoteForce__Custom_Page__c 
                WHERE QuoteForce__Quotes__c =: recordId WITH USER_MODE];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<QuoteForce__Master_Template__c> getLayouts() {
        return [SELECT Id, QuoteForce__Layout_Name__c, QuoteForce__Date__c, QuoteForce__First_Name__c, 
                QuoteForce__Last_Name__c, QuoteForce__Street_Address__c, QuoteForce__City__c, 
                QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c, QuoteForce__Pages_JSON__c,
                QuoteForce__Letter_from_the_owner__c, QuoteForce__IsDefault__c 
                FROM QuoteForce__Master_Template__c WITH USER_MODE ORDER BY CreatedDate DESC LIMIT 200];
    }
    
    @AuraEnabled
    public static List<QuoteForce__Master_Template__c> getLayoutSearch(String searchKey) {
        String searchTerm = '%' + String.escapeSingleQuotes(searchKey) + '%';
        return [SELECT Id, QuoteForce__Layout_Name__c, QuoteForce__Date__c, QuoteForce__First_Name__c, 
                QuoteForce__Last_Name__c, QuoteForce__Street_Address__c, QuoteForce__City__c, 
                QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c, QuoteForce__Pages_JSON__c,
                QuoteForce__Letter_from_the_owner__c, QuoteForce__IsDefault__c 
                FROM QuoteForce__Master_Template__c 
                WHERE QuoteForce__Layout_Name__c LIKE :searchTerm WITH USER_MODE ORDER BY CreatedDate DESC];
    }
    
    @AuraEnabled
    public static QuoteForce__Master_Template__c getLayoutRecord(String mtId) {
        QuoteForce__Master_Template__c mt = [
            SELECT Id, QuoteForce__Layout_Name__c, QuoteForce__Date__c, QuoteForce__First_Name__c, 
            QuoteForce__Last_Name__c, QuoteForce__Currency__c, QuoteForce__Street_Address__c, 
            QuoteForce__City__c, QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c,
            QuoteForce__Letter_from_the_owner__c, QuoteForce__Primary_Image__c, 
            QuoteForce__Secondary_Image__c, QuoteForce__Pages_JSON__c, 
            QuoteForce__Warranty_Doc__c, QuoteForce__Terms_Condition_doc__c,
            (SELECT ContentDocumentId, ContentDocument.LatestPublishedVersionId, ContentDocument.Title, LinkedEntityId
             FROM ContentDocumentLinks)
            FROM QuoteForce__Master_Template__c 
            WHERE Id =: mtId WITH USER_MODE
            LIMIT 200
        ];
        return mt;
    }
    
    @AuraEnabled
    public static void attachDocsToQuote(Id quoteId,Id primaryDocId,Id secondaryDocId,Id warrantyDocId,Id termConDocId) {
        // Validate Quote Id
        if (quoteId == null) {
            return;
        }

        // Collect document ids
        Set<Id> candidateDocIds = new Set<Id>();

        if (primaryDocId != null) {
            candidateDocIds.add(primaryDocId);
        }
        if (secondaryDocId != null) {
            candidateDocIds.add(secondaryDocId);
        }
        if (warrantyDocId != null) {
            candidateDocIds.add(warrantyDocId);
        }
        if (termConDocId != null) {
            candidateDocIds.add(termConDocId);
        }

        if (candidateDocIds.isEmpty()) {
            return;
        }

        // Validate ContentDocument access
        List<ContentDocument> contentDocuments = [ SELECT Id FROM ContentDocument WHERE Id IN :candidateDocIds WITH USER_MODE ];

        Set<Id> validDocumentIds = new Set<Id>();

        for (ContentDocument document : contentDocuments) {
            validDocumentIds.add(document.Id);
        }

        if (validDocumentIds.isEmpty()) {
            return;
        }

        // Check already linked documents
        List<ContentDocumentLink> existingLinks = [ SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = :quoteId AND ContentDocumentId IN :validDocumentIds WITH USER_MODE ];

        Set<Id> alreadyLinkedDocumentIds = new Set<Id>();

        for (ContentDocumentLink existingLink : existingLinks) {
            alreadyLinkedDocumentIds.add(existingLink.ContentDocumentId);
        }

        List<ContentDocumentLink> linksToInsert = new List<ContentDocumentLink>();

        if (primaryDocId != null && validDocumentIds.contains(primaryDocId) && !alreadyLinkedDocumentIds.contains(primaryDocId)) {
            linksToInsert.add(new ContentDocumentLink(
                LinkedEntityId = quoteId,
                ContentDocumentId = primaryDocId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            ));
        }

        if (secondaryDocId != null && validDocumentIds.contains(secondaryDocId) && !alreadyLinkedDocumentIds.contains(secondaryDocId)) {
            linksToInsert.add(new ContentDocumentLink(
                LinkedEntityId = quoteId,
                ContentDocumentId = secondaryDocId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            ));
        }

        if (warrantyDocId != null && validDocumentIds.contains(warrantyDocId) && !alreadyLinkedDocumentIds.contains(warrantyDocId)) {
            linksToInsert.add(new ContentDocumentLink(
                LinkedEntityId = quoteId,
                ContentDocumentId = warrantyDocId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            ));
        }

        if (termConDocId != null && validDocumentIds.contains(termConDocId) && !alreadyLinkedDocumentIds.contains(termConDocId)) {
            linksToInsert.add(new ContentDocumentLink(
                LinkedEntityId = quoteId,
                ContentDocumentId = termConDocId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            ));
        }

        if (linksToInsert.isEmpty()) {
            return;
        }

        SObjectAccessDecision accessDecision = Security.stripInaccessible(
            AccessType.CREATABLE,
            linksToInsert
        );

        List<ContentDocumentLink> sanitizedLinks =(List<ContentDocumentLink>) accessDecision.getRecords();

        if (!sanitizedLinks.isEmpty()) {
            insert as user sanitizedLinks;
        }
    }
    @AuraEnabled(cacheable=false)
    public static Map<String, String> cloneTemplateDocsToQuote(Id templateId, Id quoteId) {
        Map<String, String> clonedUrls = new Map<String, String>();
        
        if (templateId == null || quoteId == null) {
            return clonedUrls;
        }
        
        List<ContentDocumentLink> templateLinks = [
            SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.FileExtension
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :templateId WITH USER_MODE];
        
        if (templateLinks.isEmpty()) {
            return clonedUrls;
        }
        
        Set<Id> contentDocumentIds = new Set<Id>();
        Map<Id, ContentDocumentLink> templateLinkByDocId = new Map<Id, ContentDocumentLink>();
        for (ContentDocumentLink templateLink : templateLinks) {
            contentDocumentIds.add(templateLink.ContentDocumentId);
            templateLinkByDocId.put(templateLink.ContentDocumentId, templateLink);
        }
        
        List<ContentVersion> sourceVersions = [
            SELECT Id, ContentDocumentId, Title, PathOnClient, VersionData
            FROM ContentVersion
            WHERE ContentDocumentId IN :contentDocumentIds
            AND IsLatest = true WITH USER_MODE];
        
        List<ContentVersion> clonedVersions = new List<ContentVersion>();
        List<String> clonedTitles = new List<String>();
        for (ContentVersion sourceVersion : sourceVersions) {
            ContentDocumentLink templateLink = templateLinkByDocId.get(sourceVersion.ContentDocumentId);
            String title = templateLink != null ? templateLink.ContentDocument.Title : sourceVersion.Title;
            
            if (title != 'primaryDoc' && title != 'SecondaryDoc') {
                continue;
            }
            
            ContentVersion clonedVersion = new ContentVersion();
            clonedVersion.VersionData = sourceVersion.VersionData;
            clonedVersion.Title = title;
            clonedVersion.PathOnClient = String.isNotBlank(sourceVersion.PathOnClient)
                ? sourceVersion.PathOnClient
                : '/' + title;
            clonedVersions.add(clonedVersion);
            clonedTitles.add(title);
        }
        
        if (clonedVersions.isEmpty()) {
            return clonedUrls;
        }
        
        insert as user clonedVersions;
        
        List<ContentVersion> insertedVersions = [
            SELECT Id, Title, ContentDocumentId, ContentDocument.LatestPublishedVersionId
            FROM ContentVersion
            WHERE Id IN :clonedVersions WITH USER_MODE];
        
        List<ContentDocumentLink> quoteLinks = new List<ContentDocumentLink>();
        QuoteForce__Quotes__c quoteToUpdate = new QuoteForce__Quotes__c(Id = quoteId);
        
        for (ContentVersion insertedVersion : insertedVersions) {
            quoteLinks.add(new ContentDocumentLink(
                ContentDocumentId = insertedVersion.ContentDocumentId,
                LinkedEntityId = quoteId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            ));
            
            String fileUrl = '/sfc/servlet.shepherd/version/download/' + insertedVersion.ContentDocument.LatestPublishedVersionId;
            if (insertedVersion.Title == 'primaryDoc') {
                quoteToUpdate.QuoteForce__Primary_Image__c = fileUrl;
                clonedUrls.put('primaryImageUrl', fileUrl);
            } else if (insertedVersion.Title == 'SecondaryDoc') {
                quoteToUpdate.QuoteForce__Secondary_Image__c = fileUrl;
                clonedUrls.put('secondaryImageUrl', fileUrl);
            }
        }
        
        if (!quoteLinks.isEmpty()) {
            insert as user quoteLinks;
        }
        
        update as user quoteToUpdate;
        return clonedUrls;
    }
    
    @AuraEnabled
    public static QuoteForce__Quotes__c getQuoteDocumentLinks(String quoteId) {
        return [
            SELECT Id,
            (SELECT ContentDocumentId, ContentDocument.LatestPublishedVersionId, ContentDocument.Title
             FROM ContentDocumentLinks)
            FROM QuoteForce__Quotes__c
            WHERE Id = :quoteId WITH USER_MODE
            LIMIT 1
        ];
    }
    
    @AuraEnabled
    public static void updateQuoteDetails(
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
        String pagesJSON,
        String currencyType,
        Id priceBookId
    ) {
        if (String.isBlank(quoteId)) {
            throw new AuraHandledException('quoteId is required');
        }
        
        QuoteForce__Quotes__c quote = [
            SELECT Id, QuoteForce__First_Name__c, QuoteForce__Last_Name__c, QuoteForce__Street_Address__c, 
            QuoteForce__City__c, QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c, 
            QuoteForce__Date__c, QuoteForce__Layout_Name__c, QuoteForce__Letter_from_the_owner__c, 
            QuoteForce__Pages_JSON__c, QuoteForce__Currency__c, QuoteForce__Price_Book__c
            FROM QuoteForce__Quotes__c
            WHERE Id = :quoteId WITH USER_MODE
            LIMIT 1
        ];
        
        quote.QuoteForce__First_Name__c = firstName;
        quote.QuoteForce__Last_Name__c = lastName;
        quote.QuoteForce__Street_Address__c = streetAddress;
        quote.QuoteForce__City__c = city;
        quote.QuoteForce__State_Province__c = stateProvince;
        quote.QuoteForce__Zip_code_Postal_code__c = zipCode;
        quote.QuoteForce__Layout_Name__c = layoutName;
        quote.QuoteForce__Date__c = CreatedDate;
        quote.QuoteForce__Letter_from_the_owner__c = letterForm;
        quote.QuoteForce__Currency__c = currencyType;
        quote.QuoteForce__Price_Book__c = priceBookId;
        
        if (String.isNotBlank(pagesJSON)) {
            quote.QuoteForce__Pages_JSON__c = pagesJSON;
        }
        
        update as user quote;
        
        System.debug('Updated Quote Pages_JSON__c length: ' + (quote.QuoteForce__Pages_JSON__c != null ? quote.QuoteForce__Pages_JSON__c.length() : 0));
    }
    
    @AuraEnabled(cacheable=false)
    public static Id uploadFile(String base64Data, String fileName, Id parentId) {
        System.debug('check parent ID-----------'+parentId);
        try {
            if (String.isBlank(base64Data)) {
                throw new AuraHandledException('File data is required.');
            }

            if (String.isBlank(fileName)) {
                throw new AuraHandledException('File name is required.');
            }

            if (parentId == null) {
                throw new AuraHandledException('Parent record ID is required.');
            }
            String sanitizedName = fileName.trim().toLowerCase();
            if (!sanitizedName.endsWith('.jpg') &&
                !sanitizedName.endsWith('.jpeg') &&
                !sanitizedName.endsWith('.png') &&
                !sanitizedName.endsWith('.pdf')) {
                throw new AuraHandledException('Invalid file type. Only JPG, JPEG, PNG and PDF files are allowed.');
            }

            ContentVersion contentVersion = new ContentVersion(
                VersionData = EncodingUtil.base64Decode(base64Data),
                Title = fileName,
                PathOnClient = '/' + fileName
            );

            List<ContentVersion> sanitizedVersions =
                (List<ContentVersion>) Security.stripInaccessible(
                    AccessType.CREATABLE,
                    new List<ContentVersion>{ contentVersion }
                ).getRecords();

            if (sanitizedVersions.isEmpty()) {
                throw new AuraHandledException('You do not have permission to upload this file.');
            }

            insert as user sanitizedVersions;

            ContentVersion insertedVersion = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :sanitizedVersions[0].Id WITH USER_MODE LIMIT 1];

            ContentDocumentLink documentLink = new ContentDocumentLink(
                ContentDocumentId = insertedVersion.ContentDocumentId,
                LinkedEntityId = parentId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            );

            List<ContentDocumentLink> sanitizedLinks =
                (List<ContentDocumentLink>) Security.stripInaccessible(
                    AccessType.CREATABLE,
                    new List<ContentDocumentLink>{ documentLink }
                ).getRecords();

            if (sanitizedLinks.isEmpty()) {
                throw new AuraHandledException('You do not have permission to attach this file.');
            }

            insert as user sanitizedLinks;

            return insertedVersion.ContentDocumentId;

        } catch (AuraHandledException ex) {
            throw ex;
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
    
    @AuraEnabled
    public static QuoteForce__Master_Template__c UpdateMasterLayout(QuoteForce__Master_Template__c mstLayoutObj){
        System.debug('update master layout'+ mstLayoutObj);
        try {
            if (mstLayoutObj.Id != null) {
                update as user mstLayoutObj;
            }
        } catch (Exception e) {
            System.debug('Exception: ' + e);
        }
        return mstLayoutObj;
    }
    
    @AuraEnabled(cacheable=false)
    public static void makeDefault(String layoutId) {
        try {
            List<QuoteForce__Master_Template__c> layouts = [
                SELECT Id, QuoteForce__IsDefault__c 
                FROM QuoteForce__Master_Template__c 
                WHERE QuoteForce__IsDefault__c = true WITH USER_MODE];
            for (QuoteForce__Master_Template__c layout : layouts) {
                layout.QuoteForce__IsDefault__c = false;
            }
            update as user layouts;
            
            QuoteForce__Master_Template__c defaultLayout = [
                SELECT Id FROM QuoteForce__Master_Template__c 
                WHERE Id = :layoutId WITH USER_MODE LIMIT 1];
            defaultLayout.QuoteForce__IsDefault__c = true;
            update as user defaultLayout;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to set default layout: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void deleteLayout(Id layoutId) {
        List<ContentDocumentLink> links = [
            SELECT ContentDocumentId 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId = :layoutId WITH USER_MODE];
        
        Set<Id> documentIds = new Set<Id>();
        for (ContentDocumentLink link : links) {
            documentIds.add(link.ContentDocumentId);
        }
        
        delete as user links;
        
        if (!documentIds.isEmpty()) {
            List<ContentDocument> docs = [SELECT Id FROM ContentDocument WHERE Id IN :documentIds WITH USER_MODE];
            delete as user docs;
        }
        
        QuoteForce__Master_Template__c layoutToDelete = [
            SELECT Id FROM QuoteForce__Master_Template__c 
            WHERE Id = :layoutId WITH USER_MODE LIMIT 1];
        delete as user layoutToDelete;
    }
    
    @AuraEnabled(cacheable=false)
    public static void deleteLayoutPage(Id layoutId) {
        List<ContentDocumentLink> links = [
            SELECT ContentDocumentId 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId = :layoutId WITH USER_MODE];
        
        Set<Id> documentIds = new Set<Id>();
        for (ContentDocumentLink link : links) {
            documentIds.add(link.ContentDocumentId);
        }
        
        delete as user links;
        
        if (!documentIds.isEmpty()) {
            List<ContentDocument> docs = [SELECT Id FROM ContentDocument WHERE Id IN :documentIds WITH USER_MODE];
            delete as user docs;
        }
        
        QuoteForce__Custom_Page__c layoutToDelete = [
            SELECT Id FROM QuoteForce__Custom_Page__c 
            WHERE Id = :layoutId WITH USER_MODE LIMIT 1];
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
                    
                    List<ContentVersion> cvList = [SELECT ContentDocumentId FROM ContentVersion WHERE Id IN :cvListToInsert WITH USER_MODE];
                    
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
    
    public class fileWrapper{
        public String filename;	
        public String base64;
        public String recordId;	
    }
    
    @AuraEnabled
    public static void saveImageUrl(Id recordId, String fieldName, String fileUrl) {
        if (String.isNotBlank(recordId) && String.isNotBlank(fieldName)) {
            QuoteForce__Quotes__c quoteRecord = new QuoteForce__Quotes__c(Id = recordId);
            quoteRecord.put(QuoteForceSecurityUtil.normalizeLocalApiName(fieldName), normalizeFileUrl(fileUrl));
            update as user quoteRecord;
        }
    }
    
    private static String normalizeFileUrl(String fileUrl) {
        if (String.isBlank(fileUrl)) {
            return null;
        }
        
        String normalized = fileUrl.trim();
        if (normalized.startsWith('blob:')) {
            return null;
        }
        
        if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
            return normalized;
        }
        
        if (normalized.startsWith('/sfc/')) {
            return URL.getOrgDomainUrl().toExternalForm() + normalized;
        }
        
        if (normalized.startsWith('068') || normalized.startsWith('069')) {
            return URL.getOrgDomainUrl().toExternalForm() + '/sfc/servlet.shepherd/document/download/' + normalized;
        }
        
        return normalized;
    }
}