public with sharing class AdminSettingController {
    
    private static final List<String> ADMIN_CONFIG_FIELDS = new List<String>{
        'Id',
            'Name',
            'QuoteForce__Phone__c',
            'QuoteForce__Email__c',
            'QuoteForce__Address__c',
            'QuoteForce__Street__c',
            'QuoteForce__City__c',
            'QuoteForce__State_Province__c',
            'QuoteForce__Postal_Code__c',
            'QuoteForce__Country__c',
            'QuoteForce__Company_Logo_URL__c',
            'QuoteForce__Signature_URL__c',
            'QuoteForce__Default_Warranty__c',
            'QuoteForce__Default_Terms_Conditions__c',
            'QuoteForce__Active_Letter_Of_Owner__c',
            'QuoteForce__Active_Quote_Details__c',
            'QuoteForce__Active_Terms_and_Conditions__c',
            'QuoteForce__Active_Title__c',
            'QuoteForce__Active_Warranty__c',
            'QuoteForce__Fecth_Address_From_Account__c',
            'QuoteForce__Currency__c',
            'QuoteForce__Invoice_Terms_Condition__c',
            'QuoteForce__Notes__c',
            'QuoteForce__Link_With_Opportunity__c'
            };
                
                private static final Set<String> FILE_URL_FIELDS = new Set<String>{
                        'QuoteForce__Signature_URL__c',
                        'QuoteForce__Company_Logo_URL__c',
                        'QuoteForce__Default_Warranty__c',
                        'QuoteForce__Default_Terms_Conditions__c'
                        };
                            
                            @AuraEnabled
                            public static void deleteContentDocument(Id contentDocumentId) {
                                List<ContentDocumentLink> links = [
                                    SELECT Id
                                    FROM ContentDocumentLink
                                    WHERE ContentDocumentId = :contentDocumentId WITH USER_MODE];
                                delete as user links;
                                
                                ContentDocument doc = [SELECT Id FROM ContentDocument WHERE Id = :contentDocumentId WITH USER_MODE];
                                delete as user doc;
                            }
    
    @AuraEnabled(cacheable=false)
    public static QuoteForce__Admin_Configuration__c getAdminConfig() {
        Id resolvedId = resolveAdminConfigId();
        return queryAdminConfig(resolvedId);
    }
    
    public static void validateAdminConfig(QuoteForce__Admin_Configuration__c config) {
        
        // Email Validation
        if(!String.isBlank(config.QuoteForce__Email__c)) {
            Pattern emailPattern = Pattern.compile('^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$');
            Matcher emailMatcher = emailPattern.matcher(config.QuoteForce__Email__c);
            
            if(!emailMatcher.matches()) {
                throw new AuraHandledException('Please enter a valid Email address');
            }
        }
        
        // Phone Validation (Only digits)
        if(!String.isBlank(config.QuoteForce__Phone__c)) {
            //   Pattern phonePattern = Pattern.compile('^[0-9]{20}$');
            Pattern phonePattern = Pattern.compile('^\\+?[0-9]{1,20}$');
            Matcher phoneMatcher = phonePattern.matcher(config.QuoteForce__Phone__c);
            
            if(!phoneMatcher.matches()) {
                throw new AuraHandledException('Please enter a valid phone number');
            }
        }
    }
    
    
    @AuraEnabled
    public static QuoteForce__Admin_Configuration__c saveAdminConfig(QuoteForce__Admin_Configuration__c config) {
        if (config == null) {
            throw new AuraHandledException('Configuration payload is required');
        }
        
        if (config.Id == null) {
            Id resolvedId = resolveAdminConfigId();
            if (resolvedId != null) {
                config.Id = resolvedId;
            }
        }
        if(String.isBlank(config.Name)){
            config.Name = ' ';
        }
        
        validateAdminConfig(config);
        
        upsert as user config;
        return queryAdminConfig(config.Id);
    }
    
    @AuraEnabled
    public static QuoteForce__Admin_Configuration__c deleteCompanyLogo() {
        Id resolvedId = requireAdminConfigId();
        QuoteForce__Admin_Configuration__c conf = new QuoteForce__Admin_Configuration__c(
            Id = resolvedId,
            QuoteForce__Company_Logo_URL__c  = null
        );
        
        update as user conf;
        return queryAdminConfig(resolvedId);
    }
    
    @AuraEnabled
    public static void saveFileUrl(String fieldName, String documentId) {
        fieldName = validateFileField(fieldName);
        if (String.isBlank(documentId)) {
            throw new AuraHandledException('Invalid parameters');
        }
        
        ContentVersion cv = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion
            WHERE ContentDocumentId = :documentId WITH USER_MODE
            ORDER BY CreatedDate DESC 
            LIMIT 1 
        ];
        
        String fileUrl = '/sfc/servlet.shepherd/document/download/' + cv.ContentDocumentId;
        QuoteForce__Admin_Configuration__c config = new QuoteForce__Admin_Configuration__c(Id = requireAdminConfigId());
        config.put(fieldName, fileUrl);
        update as user config;
    }
    
    @AuraEnabled
    public static void clearFileUrl(String fieldName) {
        fieldName = validateFileField(fieldName);
        QuoteForce__Admin_Configuration__c config = new QuoteForce__Admin_Configuration__c(Id = requireAdminConfigId());
        config.put(fieldName, null);
        update as user config;
    }
    
   private static String validateFileField(String fieldName) {
    if (String.isBlank(fieldName) || !FILE_URL_FIELDS.contains(fieldName)) {
        throw new AuraHandledException('Invalid file field');
    }
    return fieldName;
}
    
    private static Id requireAdminConfigId() {
        return resolveAdminConfigId();
    }
    
    private static Id resolveAdminConfigId() {
        List<QuoteForce__Admin_Configuration__c> defaults = [
            SELECT Id
            FROM QuoteForce__Admin_Configuration__c WITH USER_MODE
            ORDER BY CreatedDate ASC LIMIT 1
        ];
        if (!defaults.isEmpty()) {
            return defaults[0].Id;
        }
        
        QuoteForce__Admin_Configuration__c config = createDefaultAdminConfig();
        config.Name = [SELECT Id, Name FROM Organization WITH USER_MODE LIMIT 1].Name;
        insert as user config;
        return config.Id;
    }
    
    private static QuoteForce__Admin_Configuration__c createDefaultAdminConfig() {
        return new QuoteForce__Admin_Configuration__c(
            Name = ' ',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Active_Title__c = true,
            QuoteForce__Active_Quote_Details__c = true,
            QuoteForce__Active_Warranty__c = true,
            QuoteForce__Active_Terms_and_Conditions__c = true,
            QuoteForce__Active_Letter_Of_Owner__c = true,
            QuoteForce__Notes__c = '',
            QuoteForce__Invoice_Terms_Condition__c = '',
            QuoteForce__Fecth_Address_From_Account__c = false,
            QuoteForce__Link_With_Opportunity__c = false
                );
    }
    
    private static QuoteForce__Admin_Configuration__c queryAdminConfig(Id recordId) {
        String soql = 'SELECT ' + String.join(ADMIN_CONFIG_FIELDS, ', ') +
            ' FROM 	QuoteForce__Admin_Configuration__c WHERE Id = :recordId LIMIT 1';
        return Database.queryWithBinds(soql, new Map<String, Object>{ 'recordId' => recordId }, AccessLevel.USER_MODE);
    }
}
