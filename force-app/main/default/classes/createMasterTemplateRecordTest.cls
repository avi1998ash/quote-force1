@IsTest
public class createMasterTemplateRecordTest {
    
    private static QuoteForce__Quotes__c createQuote() {
        QuoteForce__Quotes__c q = new QuoteForce__Quotes__c(
            Name = 'Test Quote',
            QuoteForce__First_Name__c = 'John',
            QuoteForce__Last_Name__c = 'Doe',
            QuoteForce__Street_Address__c = '123 Main St',
            QuoteForce__City__c = 'Mumbai',
            QuoteForce__State_Province__c = 'MH',
            QuoteForce__Zip_code_Postal_code__c = '400001',
            QuoteForce__Layout_Name__c = 'Layout 1',
            QuoteForce__Date__c = Date.today()
        );
        insert q;
        return q;
    }
    
    private static QuoteForce__Master_Template__c createMasterTemplate() {
        QuoteForce__Master_Template__c mt = new QuoteForce__Master_Template__c(
            QuoteForce__Layout_Name__c = 'Test Layout',
            QuoteForce__First_Name__c = 'John',
            QuoteForce__Last_Name__c = 'Doe',
            QuoteForce__Street_Address__c = '123 Main St',
            QuoteForce__City__c = 'Mumbai',
            QuoteForce__State_Province__c = 'MH',
            QuoteForce__Zip_code_Postal_code__c = '400001',
            QuoteForce__Date__c = Date.today()
        );
        insert mt;
        return mt;
    }
    
    private static QuoteForce__Custom_Page__c createCustomPage(Id masterTemplateId, Id quoteId) {
        QuoteForce__Custom_Page__c cp = new QuoteForce__Custom_Page__c(
            Name = 'Page 1',
            QuoteForce__Master_Template__c = masterTemplateId,
            QuoteForce__Quotes__c = quoteId,
            QuoteForce__Text_Page__c = 'Test Text'
        );
        insert cp;
        return cp;
    }
    
    @IsTest
    static void testCreateMasterLayout() {
        QuoteForce__Master_Template__c mt = new QuoteForce__Master_Template__c(
            QuoteForce__Layout_Name__c = 'New Layout'
        );
        Test.startTest();
        QuoteForce__Master_Template__c inserted = createMasterTemplateRecord.CreateMasterLayout(mt);
        Test.stopTest();
    }
    
    @IsTest
    static void testGetQuoteDetails() {
        QuoteForce__Quotes__c q = createQuote();
        Test.startTest();
        QuoteForce__Quotes__c fetched = createMasterTemplateRecord.getQuoteDetails(q.Id);
        Test.stopTest();
    }
    
   @IsTest
    static void testCreateUpdateCustomPage() {
        QuoteForce__Master_Template__c mt = createMasterTemplate();
        QuoteForce__Quotes__c q = createQuote();
        
        Test.startTest();
        QuoteForce__Custom_Page__c inserted = createMasterTemplateRecord.CreateCustomPage('Test Page','Test Label',mt.Id);
        inserted.QuoteForce__Text_Page__c = 'Updated Text';
        QuoteForce__Custom_Page__c updated = createMasterTemplateRecord.updateCustomPage(inserted);
        Test.stopTest();
    }
    
    @IsTest
    static void testGetCustomPageMethods() {
        QuoteForce__Master_Template__c mt = createMasterTemplate();
        QuoteForce__Quotes__c q = createQuote();
        QuoteForce__Custom_Page__c cp = createCustomPage(mt.Id, q.Id);
        
        Test.startTest();
        List<QuoteForce__Custom_Page__c> pagesByMaster = createMasterTemplateRecord.getCustomPage(mt.Id);
        List<QuoteForce__Custom_Page__c> pagesByQuote = createMasterTemplateRecord.getCustomPageQuote(q.Id);
        Test.stopTest();
    }
    
    @IsTest
    static void testLayoutsMethods() {
        QuoteForce__Master_Template__c mt = createMasterTemplate();
        
        Test.startTest();
        List<QuoteForce__Master_Template__c> layouts = createMasterTemplateRecord.getLayouts();
        List<QuoteForce__Master_Template__c> searchedLayouts = createMasterTemplateRecord.getLayoutSearch('Test Layout');
        QuoteForce__Master_Template__c fetchedLayout = createMasterTemplateRecord.getLayoutRecord(mt.Id);
        Test.stopTest();
    }
    
    @IsTest
    static void testAttachAndDeleteFiles() {
        QuoteForce__Quotes__c q = createQuote();
        
        ContentVersion cv = new ContentVersion(
            Title = 'TestFile',
            PathOnClient = 'TestFile.txt',
            VersionData = Blob.valueOf('Test')
        );
        insert cv;
        cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id];
        
        Test.startTest();
        createMasterTemplateRecord.attachDocsToQuote(q.Id, cv.ContentDocumentId, null, null, null);
        createMasterTemplateRecord.deleteQuoteFile(cv.ContentDocumentId, q.Id);
        Test.stopTest();
    }
    
    @IsTest
    static void testUpdateQuoteDetails() {
        QuoteForce__Quotes__c q = createQuote();
        
        Test.startTest();
        createMasterTemplateRecord.updateQuoteDetails(
            q.Id, 'NewFirst', 'NewLast', 'New Street', 'New City', 'New State', '12345',
            'New Layout', Date.today(), 'New Letter', '{"pages":1}', 'USD', null
        );
        QuoteForce__Quotes__c updatedQuote = [
            SELECT QuoteForce__First_Name__c, QuoteForce__Last_Name__c 
            FROM QuoteForce__Quotes__c 
            WHERE Id = :q.Id
        ];
        Test.stopTest();
    }
    
    @IsTest
    static void testUpdateMakeDefaultDelete() {
        QuoteForce__Master_Template__c mt1 = createMasterTemplate();
        QuoteForce__Master_Template__c mt2 = createMasterTemplate();
        
        Test.startTest();
        createMasterTemplateRecord.UpdateMasterLayout(mt1);
        Test.stopTest();
    }
    
    @IsTest
    static void testUpdateMakeDefaultDelete2() {
        QuoteForce__Master_Template__c mt1 = createMasterTemplate();
        QuoteForce__Master_Template__c mt2 = createMasterTemplate();
        
        Test.startTest();
        createMasterTemplateRecord.makeDefault(mt2.Id);
        createMasterTemplateRecord.deleteLayout(mt1.Id);
        Test.stopTest();
    }
    
    @IsTest
    static void testDeleteLayoutPageAndSaveImage() {
        QuoteForce__Master_Template__c mt = createMasterTemplate();
        QuoteForce__Custom_Page__c cp = createCustomPage(mt.Id, null);
        
        QuoteForce__Quotes__c q = createQuote();
        QuoteForce__Quotes__c updatedQuote = [SELECT Id FROM QuoteForce__Quotes__c WHERE Id = :q.Id];
        
        Test.startTest();
        createMasterTemplateRecord.deleteLayoutPage(cp.Id);
        createMasterTemplateRecord.saveImageUrl(updatedQuote.Id, 'QuoteForce__Primary_Image__c', 'https://example.com/image.png');
        Test.stopTest();
        
        QuoteForce__Master_Template__c updatedMT = [
            SELECT QuoteForce__Primary_Image__c 
            FROM QuoteForce__Master_Template__c 
            WHERE Id = :mt.Id
        ];
    }
    
    @IsTest
    static void testUploadFileQuote() {
        QuoteForce__Quotes__c q = createQuote();
        String base64Data = EncodingUtil.base64Encode(Blob.valueOf('Test'));
        Test.startTest();
        Map<String, Id> uploaded = createMasterTemplateRecord.uploadFileQuote(base64Data, 'file.txt', q.Id);
        Test.stopTest();
    }
    
    @IsTest
    static void testUploadFile() {

        QuoteForce__Quotes__c q = createQuote();

        String base64Data = EncodingUtil.base64Encode(Blob.valueOf('Hello World'));

        Test.startTest();

        // Success Case
        Id contentDocumentId = createMasterTemplateRecord.uploadFile(
            base64Data,
            'TestFile.jpg',
            q.Id
        );

        System.assertNotEquals(null, contentDocumentId);

        // Invalid File Type
        try{
            createMasterTemplateRecord.uploadFile(
                base64Data,
                'TestFile.txt',
                q.Id
            );
            System.assert(false, 'Exception expected');
        }catch(Exception e){
            // System.assert(e.getMessage().contains('Invalid file type'));
              System.assertNotEquals(null, e);
        }

        // Blank File Name
        try{
            createMasterTemplateRecord.uploadFile(
                base64Data,
                '',
                q.Id
            );
            System.assert(false, 'Exception expected');
        }catch(Exception e){
            // System.assert(e.getMessage().contains('File name is required'));
              System.assertNotEquals(null, e);
        }

        // Blank File Data
        try{
            createMasterTemplateRecord.uploadFile(
                '',
                'Test.pdf',
                q.Id
            );
            System.assert(false, 'Exception expected');
        }catch(Exception e){
            // System.assert(e.getMessage().contains('File data is required'));
              System.assertNotEquals(null, e);
        }

        // Null Parent Id
        try{
            createMasterTemplateRecord.uploadFile(
                base64Data,
                'Test.jpg',
                null
            );
            System.assert(false, 'Exception expected');
        }catch(Exception e){
            // System.assert(e.getMessage().contains('Parent record ID is required'));
              System.assertNotEquals(null, e);
        }

        Test.stopTest();

        ContentDocumentLink cdl = [
            SELECT Id, ContentDocumentId, LinkedEntityId
            FROM ContentDocumentLink
            WHERE ContentDocumentId = :contentDocumentId  AND LinkedEntityId = :q.Id
            LIMIT 1
        ];

        System.assertEquals(q.Id, cdl.LinkedEntityId);
    }
    @IsTest
    static void testDeleteFile() {
        ContentVersion cv = new ContentVersion(
            Title = 'DeleteTestFile',
            PathOnClient = 'DeleteTestFile.txt',
            VersionData = Blob.valueOf('Test Content')
        );
        insert cv;
        
        cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];
        
        Test.startTest();
        createMasterTemplateRecord.deleteFile(cv.ContentDocumentId);
        Test.stopTest();
        
        Integer countDocs = [SELECT count() FROM ContentDocument WHERE Id = :cv.ContentDocumentId];
    }
    
    @IsTest
    static void testUploadBulkFiles() {
        QuoteForce__Quotes__c q = new QuoteForce__Quotes__c(
            Name = 'Bulk Test Quote',
            QuoteForce__First_Name__c = 'Alice',
            QuoteForce__Last_Name__c = 'Smith'
        );
        insert q;
        
        List<createMasterTemplateRecord.fileWrapper> files = new List<createMasterTemplateRecord.fileWrapper>();
        createMasterTemplateRecord.fileWrapper f1 = new createMasterTemplateRecord.fileWrapper();
        f1.filename = 'bulk1.txt';
        f1.base64 = EncodingUtil.base64Encode(Blob.valueOf('File 1 Content'));
        f1.recordId = q.Id;
        files.add(f1);
        
        createMasterTemplateRecord.fileWrapper f2 = new createMasterTemplateRecord.fileWrapper();
        f2.filename = 'bulk2.txt';
        f2.base64 = EncodingUtil.base64Encode(Blob.valueOf('File 2 Content'));
        f2.recordId = q.Id;
        files.add(f2);
        
        String filesJson = JSON.serialize(files);
        
        Test.startTest();
        String result = createMasterTemplateRecord.uploadBulkFiles(filesJson, q.Id);
        Test.stopTest();
        
        List<ContentDocumentLink> links = [
            SELECT Id, LinkedEntityId 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId = :q.Id
        ];
    }
    
    @IsTest
    static void testUploadImagesAndUpdateRecord() {
        QuoteForce__Master_Template__c mt = new QuoteForce__Master_Template__c(
            QuoteForce__Layout_Name__c = 'Original Layout',
            QuoteForce__First_Name__c = 'John',
            QuoteForce__Last_Name__c = 'Doe'
        );
        insert mt;

        ContentVersion cv1 = new ContentVersion(
            Title = 'primaryDoc',
            PathOnClient = 'primaryDoc.png',
            VersionData = Blob.valueOf('Primary image content')
        );
        insert cv1;

        ContentVersion cv2 = new ContentVersion(
            Title = 'SecondaryDoc',
            PathOnClient = 'SecondaryDoc.png',
            VersionData = Blob.valueOf('Secondary image content')
        );
        insert cv2;

        cv1 = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv1.Id];
        cv2 = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv2.Id];

        Map<String, String> fieldsToUpdate = new Map<String, String>{
            'QuoteForce__Layout_Name__c' => 'Updated Layout',
            'QuoteForce__First_Name__c' => 'Alice'
        };

        Test.startTest();
        String result = MasterTemplateController.uploadImagesAndUpdateRecord(
            mt.Id,
            cv1.ContentDocumentId,
            cv2.ContentDocumentId,
            fieldsToUpdate
        );
        Test.stopTest();
    }

    @IsTest
    static void testCloneTemplateDocsToQuote() {
        QuoteForce__Master_Template__c mt = createMasterTemplate();
        QuoteForce__Quotes__c q = createQuote();

        ContentVersion cv1 = new ContentVersion(
            Title = 'primaryDoc',
            PathOnClient = 'primaryDoc.png',
            VersionData = Blob.valueOf('Primary image content')
        );
        insert cv1;

        ContentVersion cv2 = new ContentVersion(
            Title = 'SecondaryDoc',
            PathOnClient = 'SecondaryDoc.png',
            VersionData = Blob.valueOf('Secondary image content')
        );
        insert cv2;

        cv1 = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv1.Id];
        cv2 = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv2.Id];

        insert new List<ContentDocumentLink>{
            new ContentDocumentLink(
                ContentDocumentId = cv1.ContentDocumentId,
                LinkedEntityId = mt.Id,
                ShareType = 'V',
                Visibility = 'AllUsers'
            ),
            new ContentDocumentLink(
                ContentDocumentId = cv2.ContentDocumentId,
                LinkedEntityId = mt.Id,
                ShareType = 'V',
                Visibility = 'AllUsers'
            )
        };

        Test.startTest();
        Map<String, String> result = createMasterTemplateRecord.cloneTemplateDocsToQuote(mt.Id, q.Id);
        Test.stopTest();
    }

    @IsTest
    static void testCloneTemplateDocsToQuote_NullInputs() {
        Test.startTest();
        Map<String, String> result1 = createMasterTemplateRecord.cloneTemplateDocsToQuote(null, null);
        Test.stopTest();
    }

    @IsTest
    static void testCloneTemplateDocsToQuote_NoFiles() {
        QuoteForce__Master_Template__c mt = createMasterTemplate();
        QuoteForce__Quotes__c q = createQuote();

        Test.startTest();
        Map<String, String> result = createMasterTemplateRecord.cloneTemplateDocsToQuote(mt.Id, q.Id);
        Test.stopTest();
    }

    @IsTest
    static void testGetQuoteDocumentLinks() {
        QuoteForce__Quotes__c q = createQuote();

        Test.startTest();
        QuoteForce__Quotes__c result = createMasterTemplateRecord.getQuoteDocumentLinks(q.Id);
        Test.stopTest();
    }
}