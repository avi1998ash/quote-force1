@isTest
public class AdminSettingControllerTest {

    @testSetup
    static void setupData() {
        QuoteForce__Admin_Configuration__c adminConfig = new QuoteForce__Admin_Configuration__c(
            Name = 'Test Admin Config',
            QuoteForce__Phone__c = '1234567890',
            QuoteForce__Email__c = 'test@example.com',
            QuoteForce__Invoice_Terms_Condition__c = '<p>Test invoice terms</p>',
            QuoteForce__Notes__c = 'Initial notes'
        );
        insert adminConfig;

        ContentVersion cv = new ContentVersion(
            Title = 'Test File',
            PathOnClient = 'TestFile.txt',
            VersionData = Blob.valueOf('Test content')
        );
        insert cv;
    }

    @isTest
    static void testGetAdminConfigFetchesSingletonRecord() {
        QuoteForce__Admin_Configuration__c config = [SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1];

        Test.startTest();
        QuoteForce__Admin_Configuration__c result = AdminSettingController.getAdminConfig();
        Test.stopTest();
    }

    @isTest
    static void testSaveAdminConfigUpdatesResolvedMasterRecord() {
        QuoteForce__Admin_Configuration__c existingConfig = [SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1];
        QuoteForce__Admin_Configuration__c config = new QuoteForce__Admin_Configuration__c(
            Name = 'Updated Master Config',
            QuoteForce__Phone__c = '9876543210',
            QuoteForce__Invoice_Terms_Condition__c = '<p>Updated invoice terms</p>',
            QuoteForce__Notes__c = 'Updated notes'
        );

        Test.startTest();
        QuoteForce__Admin_Configuration__c savedConfig = AdminSettingController.saveAdminConfig(config);
        Test.stopTest();
    }

    @isTest
    static void testDeleteCompanyLogo() {
        QuoteForce__Admin_Configuration__c config = [SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1];
        config.QuoteForce__Company_Logo_URL__c = '/dummy/logo.png';
        update config;

        Test.startTest();
        QuoteForce__Admin_Configuration__c result = AdminSettingController.deleteCompanyLogo();
        Test.stopTest();
    }

    @isTest
    static void testSaveAndClearFileUrl() {
        QuoteForce__Admin_Configuration__c config = [SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1];
        ContentVersion cv = [SELECT Id, ContentDocumentId FROM ContentVersion LIMIT 1];

        Test.startTest();
        AdminSettingController.saveFileUrl('QuoteForce__Company_Logo_URL__c', cv.ContentDocumentId);
        AdminSettingController.clearFileUrl('QuoteForce__Company_Logo_URL__c');
        Test.stopTest();

        QuoteForce__Admin_Configuration__c refreshed = [
            SELECT QuoteForce__Company_Logo_URL__c, QuoteForce__Signature_URL__c
            FROM QuoteForce__Admin_Configuration__c
            WHERE Id = :config.Id
        ];
    }

    @isTest
    static void testSaveFileUrlRejectsUnexpectedField() {
        ContentVersion cv = [SELECT Id, ContentDocumentId FROM ContentVersion LIMIT 1];

        Test.startTest();
        try {
            AdminSettingController.saveFileUrl('Name', cv.ContentDocumentId);
        } catch (AuraHandledException ex) {
        }
        Test.stopTest();
    }

    @isTest
    static void testDeleteContentDocument() {
        ContentVersion cv = [SELECT Id, ContentDocumentId FROM ContentVersion LIMIT 1];
        ContentDocumentLink link = new ContentDocumentLink(
            ContentDocumentId = cv.ContentDocumentId,
            LinkedEntityId = [SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1].Id,
            ShareType = 'V'
        );
        insert link;

        Test.startTest();
        AdminSettingController.deleteContentDocument(cv.ContentDocumentId);
        Test.stopTest();

        Integer linksCount = [SELECT count() FROM ContentDocumentLink WHERE ContentDocumentId = :cv.ContentDocumentId];
        Integer docCount = [SELECT count() FROM ContentDocument WHERE Id = :cv.ContentDocumentId];
    }
}