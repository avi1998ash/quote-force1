public with sharing class PageSectionController {
    public QuoteForce__Quotes__c Quotes { get; set; }
    public QuoteForce__Admin_Configuration__c companyinfo { get; set; }
    public List<Map<String,Object>> activePages { get; set; }
    public List<SectionWrap> sectionsData { get; set; }
    public Decimal grandTotal { get; set; }
    public Boolean isTitle {get;set;}
    public Boolean isLetterFromOwner {get;set;}
    public Boolean isQuoteDetails {get;set;}
    public Boolean isWarranty {get;set;}
    public Boolean isTermsAndConditions {get;set;}
    public Boolean isCustomPage {get;set;}
    public QuoteForce__Admin_Configuration__c adminConfig { get; private set; }
    public String logoUrl { get; private set; }
    public String warrantyImageUrl { get; private set; }
    public String termsConditionsImageUrl { get; private set; }
    public String warrantyImageDataUrl { get; private set; }
    public String termsConditionsImageDataUrl { get; private set; }
    public String warrantyPreviewSource { get; private set; }
    public String termsConditionsPreviewSource { get; private set; }
    
    public class SectionWrap {
        public QuoteForce__Product_Section__c section { get; set; }
        public Decimal sectionTotal { get; set; }
    }
    
    public class SectionWrapper {
        public String Id {get;set;}
        public String Name {get;set;}
        public String label {get;set;}
        public Boolean selected {get;set;}
        public Boolean editMode {get;set;}
        public Boolean toggle {get;set;}
        public String warrantyImage {get;set;}
        public String termConditionImage {get;set;}
    }
    
    public PageSectionController() {
        
  // String recordId = 'a03dL00002B6qsbQAB';
        
    String recordId = ApexPages.currentPage().getParameters().get('id');
        System.debug('@@@ recordId from URL: ' + recordId);
        
        
        System.debug('@@@ recordId from URL: ' + recordId);
        
        if(recordId == null){
            throw new AuraHandledException('ID IS NULL');
        }
        
        isTitle = false;
        isLetterFromOwner = false;
        isQuoteDetails = false;
        isWarranty = false;
        isTermsAndConditions = false;
        isCustomPage = false;
        
        grandTotal = 0;
        
        System.debug('Record Id from page parameter: ' + recordId);
        
        adminConfig = AdminSettingController.getAdminConfig();
        
        logoUrl = buildLogoUrl(adminConfig);
        
        QuoteForce__Quotes__c quotelist = [
            SELECT Name,
            QuoteForce__Expiration_Date__c,
            QuoteForce__Status__c,
            QuoteForce__Tax__c,
            QuoteForce__Terms_Conditions__c,
            QuoteForce__Warranty__c,
            QuoteForce__Pages_JSON__c,
            QuoteForce__Secondary_Image__c,
            QuoteForce__Primary_Image__c,
            QuoteForce__Bill_To__Street__s,
            QuoteForce__Bill_To__City__s,
            QuoteForce__Bill_To__StateCode__s,
            QuoteForce__Bill_To__PostalCode__s,
            QuoteForce__Bill_To__CountryCode__s,
            QuoteForce__Ship_To__Street__s,
            QuoteForce__Ship_To__City__s,
            QuoteForce__Ship_To__StateCode__s,
            QuoteForce__Ship_To__PostalCode__s,
            QuoteForce__Ship_To__CountryCode__s,
            QuoteForce__First_Name__c,
            QuoteForce__Last_Name__c,
            QuoteForce__Layout_Name__c,
            QuoteForce__Street_Address__c,
            QuoteForce__City__c,
            QuoteForce__State_Province__c,
            QuoteForce__Zip_code_Postal_code__c,
            CreatedDate,
            QuoteForce__Date__c,
            QuoteForce__Letter_from_the_owner__c,
             QuoteForce__Currency__c
            FROM QuoteForce__Quotes__c
            WHERE Id = :recordId WITH USER_MODE
            LIMIT 1
        ];
        
        Quotes = quotelist;
        
        warrantyPreviewSource = resolveLwcPreviewSource(
            Quotes.QuoteForce__Pages_JSON__c,
            'Warranty',
            'warrantyImage',
            Quotes.QuoteForce__Warranty__c
        );
        
        termsConditionsPreviewSource = resolveLwcPreviewSource(
            Quotes.QuoteForce__Pages_JSON__c,
            'Terms and Conditions',
            'termConditionImage',
            Quotes.QuoteForce__Terms_Conditions__c
        );
        
        warrantyImageUrl = buildFileDownloadUrl(warrantyPreviewSource);
        termsConditionsImageUrl = buildFileDownloadUrl(termsConditionsPreviewSource);
        
        warrantyImageDataUrl = buildImageDataUrl(warrantyPreviewSource);
        termsConditionsImageDataUrl = buildImageDataUrl(termsConditionsPreviewSource);
        
        List<SectionWrapper> sections = new List<SectionWrapper>();
        
        if (!String.isBlank(Quotes.QuoteForce__Pages_JSON__c)) {
            try {
                sections = (List<SectionWrapper>) JSON.deserialize(
                    Quotes.QuoteForce__Pages_JSON__c,
                    List<SectionWrapper>.class
                );
            } catch (Exception ex) {
                System.debug('Failed to parse Pages_JSON__c: ' + ex.getMessage());
            }
        }
        
        for (SectionWrapper sec : sections) {
            
            if (sec.toggle == true) {
                
                if (sec.Name == 'Title') {
                    isTitle = true;
                    
                } else if (sec.Name == 'Letter from the owner') {
                    isLetterFromOwner = true;
                    
                } else if (sec.Name == 'Quote Details') {
                    isQuoteDetails = true;
                    
                } else if (sec.Name == 'Warranty') {
                    isWarranty = true;
                    
                } else if (sec.Name == 'Terms and Conditions') {
                    isTermsAndConditions = true;
                }
            }
        }
        
        companyinfo = AdminSettingController.getAdminConfig();
        
        List<QuoteForce__Product_Section__c> rawSections = [
            
            SELECT Id,
            Name,
            QuoteForce__Notes__c,
            QuoteForce__Quotes__c,
            QuoteForce__Master_Template__c,
            
            (
                SELECT Id,
                QuoteForce__Product__c,
                QuoteForce__Product__r.Name,
                QuoteForce__Quantity__c,
                QuoteForce__Price__c,
                QuoteForce__Currency__c,
                 QuoteForce__Price_Book_Entry__r.QuoteForce__Price_Book__r.QuoteForce__Currency__c
                FROM QuoteForce__QuoteLineItems__r
                ORDER BY CreatedDate ASC
            )
            
            FROM QuoteForce__Product_Section__c
            
            WHERE QuoteForce__Quotes__c = :recordId
            WITH USER_MODE
            
            ORDER BY CreatedDate ASC
        ];
        
        sectionsData = new List<SectionWrap>();

        for (QuoteForce__Product_Section__c sec : rawSections) {

            // Skip orphaned / empty sections (no line items). When a user removes
            // every product from a section while editing, the section record can be
            // left behind in the database. The editor hides such empty sections, so
            // the PDF must do the same instead of printing a stray section heading.
            if (sec.QuoteForce__QuoteLineItems__r == null
                || sec.QuoteForce__QuoteLineItems__r.isEmpty()) {
                continue;
            }

            Decimal total = 0;

            if (sec.QuoteForce__QuoteLineItems__r != null) {
                
                for (QuoteForce__QuoteLineItem__c qli : sec.QuoteForce__QuoteLineItems__r) {
                    
                    total +=
                        (qli.QuoteForce__Quantity__c != null
                         ? qli.QuoteForce__Quantity__c
                         : 0)
                        
                        *
                        
                        (qli.QuoteForce__Price__c != null
                         ? qli.QuoteForce__Price__c
                         : 0);
                }
            }
            
            SectionWrap sw = new SectionWrap();
            
            sw.section = sec;
            sw.sectionTotal = total;
            
            sectionsData.add(sw);
            
            grandTotal += total;
        }
    }
    
    public Decimal getSectionTotal(QuoteForce__Product_Section__c sec) {
        
        Decimal total = 0;
        
        if (sec.QuoteForce__QuoteLineItems__r != null) {
            
            for (QuoteForce__QuoteLineItem__c qli : sec.QuoteForce__QuoteLineItems__r) {
                
                total +=
                    (qli.QuoteForce__Quantity__c != null
                     ? qli.QuoteForce__Quantity__c
                     : 0)
                    
                    *
                    
                    (qli.QuoteForce__Price__c != null
                     ? qli.QuoteForce__Price__c
                     : 0);
            }
        }
        
        return total;
    }
    
    private static String buildLogoUrl(QuoteForce__Admin_Configuration__c config) {
        
        if (config == null ||
            String.isBlank(config.QuoteForce__Company_Logo_URL__c)) {
                
                return null;
            }
        
        return buildFileDownloadUrl(
            config.QuoteForce__Company_Logo_URL__c
        );
    }
    
    private static String resolveLwcPreviewSource(
        String pagesJson,
        String pageLabel,
        String imageKey,
        String fallbackValue
    ) {
        
        if (String.isBlank(pagesJson)) {
            return fallbackValue;
        }
        
        try {
            
            Object parsedPages = JSON.deserializeUntyped(pagesJson);
            
            if (!(parsedPages instanceof List<Object>)) {
                return fallbackValue;
            }
            
            for (Object parsedPage : (List<Object>) parsedPages) {
                
                if (!(parsedPage instanceof Map<String, Object>)) {
                    continue;
                }
                
                Map<String, Object> page =
                    (Map<String, Object>) parsedPage;
                
                String label =
                    page.containsKey('label') &&
                    page.get('label') != null
                    
                    ? String.valueOf(page.get('label'))
                    
                    : String.valueOf(page.get('Name'));
                
                if (label == pageLabel &&
                    page.containsKey(imageKey)) {
                        
                        Object imageValue = page.get(imageKey);
                        
                        return imageValue == null
                            ? null
                            : String.valueOf(imageValue);
                    }
            }
            
        } catch (Exception ex) {
            
            System.debug(
                'Failed to resolve LWC preview image source: ' +
                ex.getMessage()
            );
        }
        
        return fallbackValue;
    }
    
    private static String buildFileDownloadUrl(String fileUrl) {
        
        if (String.isBlank(fileUrl)) {
            return null;
        }
        
        String rawValue = fileUrl.trim();
        
        if (rawValue.startsWith('http://') ||
            rawValue.startsWith('https://')) {
                
                String fileId = extractSalesforceFileId(rawValue);
                
                return buildVersionDownloadUrl(fileId, rawValue);
            }
        
        if (rawValue.startsWith('/sfc/')) {
            
            String fileId = extractSalesforceFileId(rawValue);
            
            return buildVersionDownloadUrl(
                fileId,
                URL.getOrgDomainUrl().toExternalForm() + rawValue
            );
        }
        
        return buildVersionDownloadUrl(rawValue, rawValue);
    }
    
    private static String buildVersionDownloadUrl(
        String fileId,
        String fallbackUrl
    ) {
        
        if (String.isBlank(fileId)) {
            return fallbackUrl;
        }
        
        String normalizedId = fileId.trim();
        
        if (isSalesforceFileId(normalizedId, '068')) {
            
            return URL.getOrgDomainUrl().toExternalForm() +
                '/sfc/servlet.shepherd/version/download/' +
                normalizedId;
        }
        
        if (isSalesforceFileId(normalizedId, '069')) {
            
            List<ContentDocument> docs = [
                
                SELECT LatestPublishedVersionId
                FROM ContentDocument
                WHERE Id = :normalizedId
                WITH USER_MODE
                LIMIT 1
            ];
            
            if (!docs.isEmpty() &&
                docs[0].LatestPublishedVersionId != null) {
                    
                    return URL.getOrgDomainUrl().toExternalForm() +
                        '/sfc/servlet.shepherd/version/download/' +
                        docs[0].LatestPublishedVersionId;
                }
        }
        
        return fallbackUrl;
    }
    
    private static String buildImageDataUrl(String fileUrl) {
        
        if (String.isBlank(fileUrl)) {
            return null;
        }
        
        String rawValue = fileUrl.trim();
        
        if (rawValue.startsWith('data:image/')) {
            return rawValue;
        }
        
        String fileId = rawValue;
        
        if (rawValue.startsWith('http://') ||
            rawValue.startsWith('https://') ||
            rawValue.startsWith('/sfc/')) {
                
                fileId = extractSalesforceFileId(rawValue);
            }
        
        if (String.isBlank(fileId)) {
            return rawValue;
        }
        
        ContentVersion imageVersion =
            getContentVersionForFileId(fileId.trim());
        
        if (imageVersion == null ||
            imageVersion.VersionData == null) {
                
                return rawValue;
            }
        
        return 'data:' +
            getMimeType(imageVersion.FileExtension) +
            ';base64,' +
            EncodingUtil.base64Encode(imageVersion.VersionData);
    }
    
    private static ContentVersion getContentVersionForFileId(
        String fileId
    ) {
        
        if (isSalesforceFileId(fileId, '068')) {
            
            List<ContentVersion> versions = [
                
                SELECT VersionData,
                FileExtension
                
                FROM ContentVersion
                
                WHERE Id = :fileId
                WITH USER_MODE
                
                LIMIT 1
            ];
            
            return versions.isEmpty()
                ? null
                : versions[0];
        }
        
        if (isSalesforceFileId(fileId, '069')) {
            
            List<ContentDocument> docs = [
                
                SELECT LatestPublishedVersionId
                
                FROM ContentDocument
                
                WHERE Id = :fileId
                WITH USER_MODE
                
                LIMIT 1
            ];
            
            if (docs.isEmpty() ||
                docs[0].LatestPublishedVersionId == null) {
                    
                    return null;
                }
            
            Id latestVersionId =
                docs[0].LatestPublishedVersionId;
            
            List<ContentVersion> versions = [
                
                SELECT VersionData,
                FileExtension
                
                FROM ContentVersion
                
                WHERE Id = :latestVersionId
                WITH USER_MODE
                
                LIMIT 1
            ];
            
            return versions.isEmpty()
                ? null
                : versions[0];
        }
        
        return null;
    }
    
    private static String getMimeType(String fileExtension) {
        
        if (String.isBlank(fileExtension)) {
            return 'image/png';
        }
        
        String normalizedExtension =
            fileExtension.toLowerCase();
        
        if (normalizedExtension == 'jpg' ||
            normalizedExtension == 'jpeg') {
                
                return 'image/jpeg';
            }
        
        if (normalizedExtension == 'gif') {
            return 'image/gif';
        }
        
        if (normalizedExtension == 'webp') {
            return 'image/webp';
        }
        
        return 'image/png';
    }
    
    private static Boolean isSalesforceFileId(
        String value,
        String prefix
    ) {
        
        return String.isNotBlank(value) &&
            value.startsWith(prefix) &&
            (value.length() == 15 ||
             value.length() == 18);
    }
    
    private static String extractSalesforceFileId(String value) {
        
        if (String.isBlank(value)) {
            return null;
        }
        
        Integer markerIndex =
            value.indexOf('/sfc/servlet.shepherd/');
        
        if (markerIndex < 0) {
            return null;
        }
        
        Integer lastSlashIndex =
            value.lastIndexOf('/');
        
        if (lastSlashIndex < 0 ||
            lastSlashIndex == value.length() - 1) {
                
                return null;
            }
        
        String candidate =
            value.substring(lastSlashIndex + 1);
        
        Integer queryIndex =
            candidate.indexOf('?');
        
        if (queryIndex > -1) {
            candidate =
                candidate.substring(0, queryIndex);
        }
        
        return candidate;
    }
public String currencySymbol {
    get {
        String currCode = '';

        if (sectionsData != null) {
            for (SectionWrap sw : sectionsData) {
                if (sw.section?.QuoteForce__QuoteLineItems__r != null 
                    && !sw.section.QuoteForce__QuoteLineItems__r.isEmpty()) {
                    currCode = sw.section.QuoteForce__QuoteLineItems__r[0]
                        .QuoteForce__Price_Book_Entry__r?.QuoteForce__Price_Book__r?.QuoteForce__Currency__c;
                    if (String.isBlank(currCode)) {
                        currCode = sw.section.QuoteForce__QuoteLineItems__r[0].QuoteForce__Currency__c;
                    }
                    if (!String.isBlank(currCode)) break;
                }
            }
        }

        return String.isBlank(currCode) ? '' : currCode + ' ';
    }

}
}