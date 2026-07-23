/**
* @description       : 
* @author            : ChangeMeIn@UserSettingsUnder.SFDoc
* @group             : 
* @last modified on  : 10-01-2024
* @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public with sharing class customQuoteCreateController {
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getCountryPicklistValues() {
        List<Map<String, String>> countryList = new List<Map<String, String>>();
        
        Schema.DescribeFieldResult countryFieldDescribe = QuoteForce__Quotes__c.QuoteForce__Bill_To__CountryCode__s.getDescribe();
        List<Schema.PicklistEntry> countryPicklistValues = countryFieldDescribe.getPicklistValues();
        
        for (Schema.PicklistEntry countryEntry : countryPicklistValues) {
            Map<String, String> countryMap = new Map<String, String>();
            countryMap.put('label', countryEntry.getLabel());
            countryMap.put('value', countryEntry.getValue());
            countryList.add(countryMap);
        }
        return countryList;
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getStatePicklistValues(String countryCode) {
        List<Map<String, String>> stateList = new List<Map<String, String>>();
        
        Map<String, List<String>> countryStateMap = new Map<String, List<String>>{
            'US' => new List<String>{'CA', 'TX'},
                'IN' => new List<String>{'MH', 'GJ'}, 
                    'CA' => new List<String>{'ON', 'BC'}, 
                        'AU' => new List<String>{'NSW', 'VIC'},
                            'GB' => new List<String>{'ENG', 'SCT'}, 
                                'DE' => new List<String>{'BW', 'BY'}, 
                                    'FR' => new List<String>{'IDF', 'NAQ'},
                                        'BR' => new List<String>{'SP', 'RJ'},
                                            'JP' => new List<String>{'13', '27'}, 
                                                'IT' => new List<String>{'LAZ', 'LOM'}, 
                                                    'CN' => new List<String>{'BJ', 'SH'},
                                                        'MX' => new List<String>{'CDMX', 'JAL'},
                                                            'ZA' => new List<String>{'GP', 'WC'}, 
                                                                'AR' => new List<String>{'C', 'B'},
                                                                    'ES' => new List<String>{'MD', 'CT'}, 
                                                                        'RU' => new List<String>{'MOW', 'SPE'}, 
                                                                            'KR' => new List<String>{'11', '26'},
                                                                                'NG' => new List<String>{'LA', 'FC'},
                                                                                    'NZ' => new List<String>{'AUK', 'WGN'},
                                                                                        'NL' => new List<String>{'NH', 'ZH'}, 
                                                                                            'SE' => new List<String>{'ST', 'VG'}, 
                                                                                                'CH' => new List<String>{'ZH', 'BE'}, 
                                                                                                    'BE' => new List<String>{'VBR', 'WHT'}, 
                                                                                                        'NO' => new List<String>{'03', '12'}, 
                                                                                                            'DK' => new List<String>{'84', '82'}, 
                                                                                                                'FI' => new List<String>{'ES', 'IS'}, 
                                                                                                                    'PL' => new List<String>{'MZ', 'DS'}, 
                                                                                                                        'PT' => new List<String>{'11', '13'},
                                                                                                                            'AT' => new List<String>{'9', '3'}, 
                                                                                                                                'IE' => new List<String>{'CW', 'DB'}, 
                                                                                                                                    'GR' => new List<String>{'I', 'A1'}, 
                                                                                                                                        'TR' => new List<String>{'34', '06'}, 
                                                                                                                                            'EG' => new List<String>{'C', 'GZ'},
                                                                                                                                                'KE' => new List<String>{'110', '200'}, 
                                                                                                                                                    'SA' => new List<String>{'01', '02'}, 
                                                                                                                                                        'AE' => new List<String>{'AZ', 'DU'}, 
                                                                                                                                                            'IL' => new List<String>{'TA', 'JM'},
                                                                                                                                                                'PK' => new List<String>{'PB', 'SD'}, 
                                                                                                                                                                    'BD' => new List<String>{'13', '27'}, 
                                                                                                                                                                        'MY' => new List<String>{'14', '01'},
                                                                                                                                                                            'TH' => new List<String>{'10', '63'}, 
                                                                                                                                                                                'VN' => new List<String>{'SG', 'HN'}, 
                                                                                                                                                                                    'PH' => new List<String>{'00', '03'}, 
                                                                                                                                                                                        'ID' => new List<String>{'JK', 'BT'}, 
                                                                                                                                                                                            'SG' => new List<String>{'01'}, 
                                                                                                                                                                                                'HK' => new List<String>{'HK'}, 
                                                                                                                                                                                                    'TW' => new List<String>{'TPQ', 'TXG'}
        };        
            
            if (countryStateMap.containsKey(countryCode)) {
                List<String> states = countryStateMap.get(countryCode);
                for (String state : states) {
                    Map<String, String> stateMap = new Map<String, String>();
                    stateMap.put('label', state);
                    stateMap.put('value', state);
                    stateList.add(stateMap);
                }
            } else {
                System.debug('No states available for country code: ' + countryCode);
            }
        
        return stateList;
    }
    
    @AuraEnabled
    public static List<QuoteForce__Master_Template__c> getmasterTemplate() {
        List<QuoteForce__Master_Template__c> mt = [
            SELECT Id, QuoteForce__Layout_Name__c, QuoteForce__IsDefault__c, QuoteForce__Pages_JSON__c, 
            QuoteForce__Terms_Condition_doc__c, QuoteForce__Warranty_Doc__c, QuoteForce__Currency__c 
            FROM QuoteForce__Master_Template__c WITH USER_MODE LIMIT 200
        ];
        return mt;
    }
    
    @AuraEnabled
    public static Opportunity getAddressFromAccount(String recordId) {
        Opportunity oppObj = [
            SELECT Id, Name, Account.BillingAddress, Account.ShippingAddress 
            FROM Opportunity 
            WHERE Id = :recordId WITH USER_MODE LIMIT 1
        ];
        System.debug('oppObj' + oppObj);
        return oppObj;
    }
    
    @AuraEnabled
    public static Id createQuoteRecord(Map<String, Object> quoteData) {
        try {
            QuoteForce__Quotes__c newQuote = new QuoteForce__Quotes__c();
            newQuote.Name                           = (String) quoteData.get('quoteName');
            newQuote.QuoteForce__Expiration_Date__c = Date.valueOf((String) quoteData.get('expirationDate'));
            newQuote.QuoteForce__Status__c          = (String) quoteData.get('status');
            
            String taxStr = (String) quoteData.get('tax');
            if (taxStr != null && taxStr != '') {
                newQuote.QuoteForce__Tax__c = Decimal.valueOf(taxStr);
            } else {
                newQuote.QuoteForce__Tax__c = null;
            }
            
            Database.insert(newQuote, AccessLevel.USER_MODE);
            return newQuote.Id;
        } catch (Exception e) {
            throw new AuraHandledException('Error creating quote: ' + e.getMessage() + ' - ' + e.getStackTraceString());
        }
    }
    
    @AuraEnabled
    public static QuoteForce__Quotes__c getQuoteDetails(String recordId) {
        System.debug('=== getQuoteDetails START — recordId: ' + recordId);
        
        if (String.isBlank(recordId)) {
            System.debug('getQuoteDetails — recordId is BLANK. Throwing.');
            throw new AuraHandledException('recordId is required.');
        }
        
        List<QuoteForce__Quotes__c> quoteRows;
        try {
            quoteRows = [
                SELECT Name, QuoteForce__Expiration_Date__c, QuoteForce__Status__c, QuoteForce__Tax__c,
                QuoteForce__Opportunity__c, QuoteForce__LayoutId__c, QuoteForce__Currency__c,
                QuoteForce__Price_Book__c,
                QuoteForce__Bill_To__Street__s, QuoteForce__Bill_To__City__s,
                QuoteForce__Bill_To__StateCode__s, QuoteForce__Bill_To__PostalCode__s,
                QuoteForce__Bill_To__CountryCode__s,
                QuoteForce__Ship_To__Street__s, QuoteForce__Ship_To__City__s,
                QuoteForce__Ship_To__StateCode__s, QuoteForce__Ship_To__PostalCode__s,
                QuoteForce__Ship_To__CountryCode__s,
                QuoteForce__First_Name__c, QuoteForce__Primary_Image__c,
                QuoteForce__Pages_JSON__c, QuoteForce__Secondary_Image__c,
                QuoteForce__Last_Name__c, QuoteForce__Layout_Name__c,
                QuoteForce__Street_Address__c, QuoteForce__City__c,
                QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c,
                QuoteForce__Date__c, QuoteForce__Letter_from_the_owner__c
                FROM QuoteForce__Quotes__c 
                WHERE Id = :recordId WITH USER_MODE
            ];
        } catch (Exception e) {
            System.debug('getQuoteDetails — SOQL EXCEPTION: ' + e.getMessage());
            System.debug('getQuoteDetails — Stack: ' + e.getStackTraceString());
            throw new AuraHandledException('Query failed: ' + e.getMessage());
        }
        
        System.debug('getQuoteDetails — rows returned: ' + quoteRows.size());
        
        if (quoteRows.isEmpty()) {
            System.debug('getQuoteDetails — NO ROWS for Id ' + recordId);
            throw new AuraHandledException(
                'Quote record not found or no access: ' + recordId
            );
        }
        
        QuoteForce__Quotes__c quotelist = quoteRows[0];
        System.debug('getQuoteDetails — Name: ' + quotelist.Name);
        System.debug('getQuoteDetails — Status: ' + quotelist.QuoteForce__Status__c);
        System.debug('getQuoteDetails — BillTo Street: ' + quotelist.QuoteForce__Bill_To__Street__s);
        System.debug('getQuoteDetails — END');
        return quotelist;
    }
    
    @AuraEnabled
    public static String createQuotesRecord(QuoteForce__Quotes__c quoteWrapMap) {
        System.debug('quoteWrapMap --***- ' + quoteWrapMap);
        if (quoteWrapMap != null) {
            syncRecordCurrency(quoteWrapMap);
            insert as user quoteWrapMap;
        }
        return quoteWrapMap.Id; 
    }
    
    @AuraEnabled
    public static String updateQuotesRecord(QuoteForce__Quotes__c quoteWrapMap) {
        System.debug('quoteWrapMap123 --***- ' + quoteWrapMap);
        if (quoteWrapMap != null) {
            syncRecordCurrency(quoteWrapMap);
            update as user quoteWrapMap;
        }
        return quoteWrapMap.Id;
    }
    
    @AuraEnabled(cacheable=false)
    public static Id createQuoteWithChildren(String mtId, String quoteId) {
        System.debug('DEBUG: Template Id = ' + mtId);
        System.debug('DEBUG: Quote Id = ' + quoteId);
        
        QuoteForce__Master_Template__c mt = [
            SELECT Id, QuoteForce__Layout_Name__c, QuoteForce__Date__c, QuoteForce__First_Name__c, 
            QuoteForce__Last_Name__c, QuoteForce__Terms_Condition_doc__c, QuoteForce__Warranty_Doc__c, 
            QuoteForce__Pages_JSON__c, QuoteForce__Currency__c, QuoteForce__Street_Address__c, 
            QuoteForce__City__c, QuoteForce__State_Province__c, QuoteForce__Zip_code_Postal_code__c,
            QuoteForce__Primary_Image__c, QuoteForce__Secondary_Image__c, QuoteForce__Letter_from_the_owner__c
            FROM QuoteForce__Master_Template__c
            WHERE Id = :mtId WITH USER_MODE
            LIMIT 1
        ];
        System.debug('[createQuoteWithChildren] Master Template Currency__c =>' + mt.QuoteForce__Currency__c);
        
        QuoteForce__Quotes__c newQuote = new QuoteForce__Quotes__c(
            Id = quoteId,
            QuoteForce__First_Name__c           = mt.QuoteForce__First_Name__c,
            QuoteForce__LayoutId__c             = mtId,
            QuoteForce__Layout_Name__c          = mt.QuoteForce__Layout_Name__c,
            QuoteForce__Last_Name__c            = mt.QuoteForce__Last_Name__c,
            QuoteForce__Street_Address__c       = mt.QuoteForce__Street_Address__c,
            QuoteForce__City__c                 = mt.QuoteForce__City__c,
            QuoteForce__State_Province__c       = mt.QuoteForce__State_Province__c,
            QuoteForce__Zip_code_Postal_code__c = mt.QuoteForce__Zip_code_Postal_code__c,
            QuoteForce__Date__c                 = mt.QuoteForce__Date__c,
            QuoteForce__Letter_from_the_owner__c= mt.QuoteForce__Letter_from_the_owner__c,
            QuoteForce__Terms_Conditions__c     = normalizeFileUrl(mt.QuoteForce__Terms_Condition_doc__c),
            QuoteForce__Primary_Image__c        = normalizeFileUrl(mt.QuoteForce__Primary_Image__c),
            QuoteForce__Secondary_Image__c      = normalizeFileUrl(mt.QuoteForce__Secondary_Image__c),
            QuoteForce__Pages_JSON__c           = mt.QuoteForce__Pages_JSON__c,
            QuoteForce__Warranty__c             = normalizeFileUrl(mt.QuoteForce__Warranty_Doc__c),
            QuoteForce__Currency__c             = mt.QuoteForce__Currency__c
        );
        System.debug('[createQuoteWithChildren] newQuote Currency__c BEFORE update =>' + newQuote.QuoteForce__Currency__c);
        
        syncRecordCurrency(newQuote);
        update as user newQuote;
        
        System.debug('[createQuoteWithChildren] newQuote Currency__c AFTER update =>' + newQuote.QuoteForce__Currency__c);
        
        List<QuoteForce__Product_Section__c> oldSections = [
            SELECT Id, Name, QuoteForce__Notes__c,
            (SELECT Id, QuoteForce__Product__c, QuoteForce__Product__r.Name, 
             QuoteForce__Quantity__c, QuoteForce__Price__c,
             QuoteForce__Price_Book_Entry__c
             FROM QuoteForce__QuoteLineItems__r)
            FROM QuoteForce__Product_Section__c
            WHERE QuoteForce__Master_Template__c = :mtId WITH USER_MODE
        ];
        
        List<QuoteForce__Product_Section__c> newSections = new List<QuoteForce__Product_Section__c>();
        for (QuoteForce__Product_Section__c sec : oldSections) {
            newSections.add(new QuoteForce__Product_Section__c(
                Name                    = sec.Name,
                QuoteForce__Notes__c    = sec.QuoteForce__Notes__c,
                QuoteForce__Quotes__c   = newQuote.Id
            ));
        }
        if (!newSections.isEmpty()) {
            insert as user newSections;
        }
        
        Map<Id, Id> sectionMap = new Map<Id, Id>();
        for (Integer i = 0; i < oldSections.size(); i++) {
            sectionMap.put(oldSections[i].Id, newSections[i].Id);
        }
        
        List<QuoteForce__QuoteLineItem__c> finalLineItems = new List<QuoteForce__QuoteLineItem__c>();
        for (Integer i = 0; i < oldSections.size(); i++) {
            if (oldSections[i].QuoteForce__QuoteLineItems__r != null) {
                for (QuoteForce__QuoteLineItem__c qli : oldSections[i].QuoteForce__QuoteLineItems__r) {
                    finalLineItems.add(new QuoteForce__QuoteLineItem__c(
                        QuoteForce__Product__c          = qli.QuoteForce__Product__c,
                        QuoteForce__Quantity__c         = qli.QuoteForce__Quantity__c,
                        QuoteForce__Price__c            = qli.QuoteForce__Price__c,
                        QuoteForce__Product_Section__c  = sectionMap.get(oldSections[i].Id),
                        QuoteForce__Quotes__c           = newQuote.Id,
                        QuoteForce__Price_Book_Entry__c = qli.QuoteForce__Price_Book_Entry__c 
                    ));
                }
            }
        }
        if (!finalLineItems.isEmpty()) {
            insert as user finalLineItems;
        }
        
        List<QuoteForce__Custom_Page__c> oldPages = [
            SELECT Id, Name, QuoteForce__label__c, QuoteForce__selected__c, QuoteForce__editMode__c, 
            QuoteForce__Text_Page__c, QuoteForce__toggle__c, QuoteForce__Type__c
            FROM QuoteForce__Custom_Page__c
            WHERE QuoteForce__Master_Template__c = :mtId WITH USER_MODE
        ];
        
        List<QuoteForce__Custom_Page__c> newPages = new List<QuoteForce__Custom_Page__c>();
        for (QuoteForce__Custom_Page__c page : oldPages) {
            newPages.add(new QuoteForce__Custom_Page__c(
                Name                        = page.Name,
                QuoteForce__label__c        = page.QuoteForce__label__c,
                QuoteForce__selected__c     = page.QuoteForce__selected__c,
                QuoteForce__editMode__c     = page.QuoteForce__editMode__c,
                QuoteForce__Text_Page__c    = page.QuoteForce__Text_Page__c,
                QuoteForce__toggle__c       = page.QuoteForce__toggle__c,
                QuoteForce__Type__c         = page.QuoteForce__Type__c,
                QuoteForce__Quotes__c       = newQuote.Id
            ));
        }
        if (!newPages.isEmpty()) {
            insert as user newPages;
        }
        
        Map<Id, Id> customPageMap = new Map<Id, Id>();
        for (Integer i = 0; i < oldPages.size(); i++) {
            customPageMap.put(oldPages[i].Id, newPages[i].Id);
        }
        
        Map<Id, Id> finalCustomPageMap = new Map<Id, Id>(customPageMap);
        
        cloneCustomPageAttachments(finalCustomPageMap);
        
        String remappedPagesJson = remapCustomPageIdsInJson(mt.QuoteForce__Pages_JSON__c, finalCustomPageMap);
        
        if (remappedPagesJson != mt.QuoteForce__Pages_JSON__c) {
            update as user new QuoteForce__Quotes__c(
                Id = newQuote.Id,
                QuoteForce__Pages_JSON__c = remappedPagesJson
            );
        }
        return newQuote.Id;
    }
    
    private static void cloneCustomPageAttachments(Map<Id, Id> customPageMap) {
        if (customPageMap == null || customPageMap.isEmpty()) {
            return;
        }
        
        List<ContentDocumentLink> sourceLinks = [
            SELECT ContentDocumentId, LinkedEntityId
            FROM ContentDocumentLink
            WHERE LinkedEntityId IN :customPageMap.keySet() WITH USER_MODE
        ];
        
        if (sourceLinks.isEmpty()) {
            return;
        }
        
        Set<Id> sourceDocIds = new Set<Id>();
        for (ContentDocumentLink sourceLink : sourceLinks) {
            sourceDocIds.add(sourceLink.ContentDocumentId);
        }
        
        Map<Id, ContentVersion> latestVersionByDocId = new Map<Id, ContentVersion>();
        for (ContentVersion sourceVersion : [
            SELECT Id, ContentDocumentId, Title, PathOnClient, VersionData
            FROM ContentVersion
            WHERE ContentDocumentId IN :sourceDocIds
            AND IsLatest = true WITH USER_MODE
        ]) {
            latestVersionByDocId.put(sourceVersion.ContentDocumentId, sourceVersion);
        }
        
        List<ContentVersion> clonedVersions = new List<ContentVersion>();
        List<Id> targetPageIds = new List<Id>();
        
        for (ContentDocumentLink sourceLink : sourceLinks) {
            ContentVersion sourceVersion = latestVersionByDocId.get(sourceLink.ContentDocumentId);
            Id targetPageId = customPageMap.get(sourceLink.LinkedEntityId);
            
            if (sourceVersion == null || targetPageId == null) {
                continue;
            }
            
            clonedVersions.add(new ContentVersion(
                Title = sourceVersion.Title,
                PathOnClient = String.isNotBlank(sourceVersion.PathOnClient)
                ? sourceVersion.PathOnClient
                : '/' + sourceVersion.Title,
                VersionData = sourceVersion.VersionData
            ));
            
            targetPageIds.add(targetPageId);
        }
        
        if (clonedVersions.isEmpty()) {
            return;
        }
        
        insert as user clonedVersions;
        
        Set<Id> clonedVersionIds = new Set<Id>();
        for (ContentVersion clonedVersion : clonedVersions) {
            clonedVersionIds.add(clonedVersion.Id);
        }
        
        List<ContentVersion> insertedVersions = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion
            WHERE Id IN :clonedVersionIds WITH USER_MODE
        ];
        
        List<ContentDocumentLink> clonedLinks = new List<ContentDocumentLink>();
        for (Integer i = 0; i < insertedVersions.size(); i++) {
            clonedLinks.add(new ContentDocumentLink(
                ContentDocumentId = insertedVersions[i].ContentDocumentId,
                LinkedEntityId    = targetPageIds[i],
                ShareType         = 'V',
                Visibility        = 'AllUsers'
            ));
        }
        
        if (!clonedLinks.isEmpty()) {
            insert as user clonedLinks;
        }
    }
    
    private static String remapCustomPageIdsInJson(String pagesJson, Map<Id, Id> customPageMap) {
        if (String.isBlank(pagesJson) || customPageMap == null || customPageMap.isEmpty()) {
            return pagesJson;
        }
        
        Object parsedJson = JSON.deserializeUntyped(pagesJson);
        if (replaceCustomPageIds(parsedJson, customPageMap)) {
            return JSON.serialize(parsedJson);
        }
        return pagesJson;
    }
    
    private static Boolean replaceCustomPageIds(Object node, Map<Id, Id> customPageMap) {
        Boolean hasChanges = false;
        if (node instanceof List<Object>) {
            List<Object> nodeList = (List<Object>) node;
            for (Object childNode : nodeList) {
                hasChanges = replaceCustomPageIds(childNode, customPageMap) || hasChanges;
            }
        } else if (node instanceof Map<String, Object>) {
            Map<String, Object> nodeMap = (Map<String, Object>) node;
            for (String keyName : new List<String>(nodeMap.keySet())) {
                Object currentValue = nodeMap.get(keyName);
                if (currentValue instanceof String) {
                    String currentString = (String) currentValue;
                    Id sourceId = tryParseId(currentString);
                    if (sourceId != null && customPageMap.containsKey(sourceId)) {
                        nodeMap.put(keyName, (String) customPageMap.get(sourceId));
                        hasChanges = true;
                        continue;
                    }
                }
                hasChanges = replaceCustomPageIds(currentValue, customPageMap) || hasChanges;
            }
        }
        return hasChanges;
    }
    
    private static Id tryParseId(String rawValue) {
        if (String.isBlank(rawValue)) {
            return null;
        }
        try {
            return (Id) rawValue;
        } catch (Exception ex) {
            return null;
        }
    }
    
    private static void syncRecordCurrency(SObject recordObj) {
        if (recordObj == null) {
            return;
        }
        String currencyCode = (String) recordObj.get('QuoteForce__Currency__c');
        if (String.isBlank(currencyCode)) {
            return;
        }
        try {
            recordObj.put('CurrencyIsoCode', currencyCode);
        } catch (Exception ex) {
            System.debug('CurrencyIsoCode not available on record type: ' + ex.getMessage());
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
    @AuraEnabled(cacheable=true)
    public static String getPdfPageUrl(String quoteId) {
        PageReference pdfPage = Page.quotePDFpage;
        pdfPage.getParameters().put('id', quoteId);
        return pdfPage.getUrl();
    }
}