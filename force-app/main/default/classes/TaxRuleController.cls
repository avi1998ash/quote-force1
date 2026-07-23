public with sharing class TaxRuleController {
    @AuraEnabled(cacheable=false)
    public static List<QuoteForce__Tax_Rule__c> listActiveTaxRules() {
        return [
            SELECT Id, Name, QuoteForce__Type__c, QuoteForce__Value__c, QuoteForce__Country__c, 
            QuoteForce__Country_Code__c, QuoteForce__Tax_Components__c,
            QuoteForce__Is_Default__c, QuoteForce__Applies_To__c, 
            QuoteForce__Tax_Inclusive__c, QuoteForce__HSN_SAC_Code__c, 
            QuoteForce__GSTIN_Number__c,
            QuoteForce__Is_Interstate__c, QuoteForce__Active__c
            FROM QuoteForce__Tax_Rule__c
            WHERE QuoteForce__Active__c = true
            WITH USER_MODE
            ORDER BY QuoteForce__Is_Default__c DESC, Name ASC
        ];
    }
    
    @AuraEnabled(cacheable=false)
    public static List<QuoteForce__Tax_Rule__c> listTaxRules() {
        return [
            SELECT Id, Name, QuoteForce__Type__c, QuoteForce__Value__c, QuoteForce__Country__c, 
            QuoteForce__Country_Code__c, QuoteForce__Tax_Components__c,
            QuoteForce__Is_Default__c, QuoteForce__Applies_To__c, 
            QuoteForce__Tax_Inclusive__c, QuoteForce__HSN_SAC_Code__c, 
            QuoteForce__GSTIN_Number__c,
            QuoteForce__Is_Interstate__c, QuoteForce__Active__c
            FROM QuoteForce__Tax_Rule__c WITH USER_MODE
            ORDER BY QuoteForce__Is_Default__c DESC, QuoteForce__Active__c DESC, Name ASC 
            LIMIT 200
        ];
    }
    
    @AuraEnabled(cacheable=false)
    public static QuoteForce__Tax_Rule__c saveTaxRule(QuoteForce__Tax_Rule__c taxRule) {
        if (taxRule == null) {
            throw new AuraHandledException('Tax rule payload is required');
        }
        
        if (String.isBlank(taxRule.Name)) {
            throw new AuraHandledException('Tax rule name is required');
        }
        
        if (String.isBlank(taxRule.QuoteForce__Type__c)) {
            taxRule.QuoteForce__Type__c = 'Percentage';
        }
        
        if (String.isBlank(taxRule.QuoteForce__Applies_To__c)) {
            taxRule.QuoteForce__Applies_To__c = 'All';
        }
        
        if (taxRule.QuoteForce__Active__c == null) {
            taxRule.QuoteForce__Active__c = true;
        }
        
        upsert as user taxRule;   // ← changed
        
        if (taxRule.QuoteForce__Is_Default__c == true) {
            setDefaultTaxRule(taxRule.Id);
        }
        
        return getTaxRule(taxRule.Id);
    }
    @AuraEnabled
    public static void deleteTaxRule(Id taxRuleId) {
        if (taxRuleId == null) {
            return;
        }
        
        delete as user new QuoteForce__Tax_Rule__c(Id = taxRuleId);
    }
    
    @AuraEnabled(cacheable=false)
    public static QuoteForce__Tax_Rule__c getDefaultTaxRule() {
        List<QuoteForce__Tax_Rule__c> rules = [
            SELECT Id, Name, QuoteForce__Type__c, QuoteForce__Value__c, 
            QuoteForce__Country__c, QuoteForce__Country_Code__c, 
            QuoteForce__Tax_Components__c,
            QuoteForce__Is_Default__c, QuoteForce__Applies_To__c, 
            QuoteForce__Tax_Inclusive__c, QuoteForce__HSN_SAC_Code__c, 
            QuoteForce__GSTIN_Number__c,
            QuoteForce__Is_Interstate__c, QuoteForce__Active__c
            FROM QuoteForce__Tax_Rule__c
            WHERE QuoteForce__Is_Default__c = true 
            AND QuoteForce__Active__c = true
            WITH USER_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT 1
        ];
        
        return rules.isEmpty() ? null : rules[0];
    }
    
    @AuraEnabled(cacheable=false)
    public static QuoteForce__Tax_Rule__c setDefaultTaxRule(Id taxRuleId) {
        if (taxRuleId == null) {
            throw new AuraHandledException('Tax rule Id is required');
        }
        
        List<QuoteForce__Tax_Rule__c> currentDefaults = [
            SELECT Id, QuoteForce__Is_Default__c
            FROM QuoteForce__Tax_Rule__c
            WHERE QuoteForce__Is_Default__c = true 
            AND Id != :taxRuleId
            WITH USER_MODE 
        ];
        
        for (QuoteForce__Tax_Rule__c rule : currentDefaults) {
            rule.QuoteForce__Is_Default__c = false;
        }
        
        if (!currentDefaults.isEmpty()) {
            update as user currentDefaults;  
        }
        
        QuoteForce__Tax_Rule__c selectedRule = new QuoteForce__Tax_Rule__c(
            Id = taxRuleId,
            QuoteForce__Is_Default__c = true,
            QuoteForce__Active__c = true
        );
        
        update as user selectedRule;   
        
        return getTaxRule(taxRuleId);
    }
    
    @AuraEnabled(cacheable=false)
    public static QuoteForce__Admin_Configuration__c getAdminTaxSettings() {
        List<QuoteForce__Admin_Configuration__c> configs = [
            SELECT Id, Name, QuoteForce__Enable_Tax_Calculation__c, 
            QuoteForce__Default_Tax_Rule__c, 
            QuoteForce__Default_Tax_Rule__r.Name,
            QuoteForce__Tax_Display_Mode__c, 
            QuoteForce__Company_GSTIN__c, 
            QuoteForce__Default_Tax_Country__c, 
            QuoteForce__Auto_Detect_Tax_By_Country__c,
            QuoteForce__Lock_Invoice_Tax__c, 
            QuoteForce__Default_Is_Interstate__c
            FROM QuoteForce__Admin_Configuration__c
            WITH USER_MODE
            ORDER BY CreatedDate ASC
            LIMIT 1
        ];
        
        if (!configs.isEmpty()) {
            return configs[0];
        }
        
        QuoteForce__Admin_Configuration__c config = 
            new QuoteForce__Admin_Configuration__c(
                Name = ' ',
                QuoteForce__Enable_Tax_Calculation__c = false,
                QuoteForce__Tax_Display_Mode__c = 'Tax Exclusive',
                QuoteForce__Auto_Detect_Tax_By_Country__c = false,
                QuoteForce__Lock_Invoice_Tax__c = false,
                QuoteForce__Default_Is_Interstate__c = false
            );
        
        insert as user config;
        
        return config;
    }
    
    private static QuoteForce__Tax_Rule__c getTaxRule(Id taxRuleId) {
        return [
            SELECT Id, Name, QuoteForce__Type__c, QuoteForce__Value__c, 
            QuoteForce__Country__c, QuoteForce__Country_Code__c, 
            QuoteForce__Tax_Components__c,
            QuoteForce__Is_Default__c, QuoteForce__Applies_To__c, 
            QuoteForce__Tax_Inclusive__c, QuoteForce__HSN_SAC_Code__c, 
            QuoteForce__GSTIN_Number__c,
            QuoteForce__Is_Interstate__c, QuoteForce__Active__c
            FROM QuoteForce__Tax_Rule__c
            WHERE Id = :taxRuleId WITH USER_MODE
            LIMIT 1
        ];
    }
}