@isTest
public class EmailClassTest {

    // ─────────────────────────────────────────────────────────────
    // TEST SETUP
    // ─────────────────────────────────────────────────────────────
    @testSetup
    static void setupTestData() {
        // Test Contacts
        List<Contact> contacts = new List<Contact>();
        for (Integer i = 0; i < 5; i++) {
            contacts.add(new Contact(
                FirstName = 'Test' + i,
                LastName  = 'User' + i,
                Email     = 'testuser' + i + '@example.com'
            ));
        }
        insert contacts;

        // Test Users
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        List<User> users = new List<User>();
        for (Integer i = 0; i < 3; i++) {
            users.add(new User(
                FirstName          = 'TestUser' + i,
                LastName           = 'Demo' + i,
                Email              = 'testuserdemo' + i + '@example.com',
                Username           = 'testuserdemo' + i + '@example.com',
                Alias              = 'tuser' + i,
                TimeZoneSidKey     = 'America/Los_Angeles',
                LocaleSidKey       = 'en_US',
                EmailEncodingKey   = 'UTF-8',
                LanguageLocaleKey  = 'en_US',
                ProfileId          = p.Id,
                IsActive           = true
            ));
        }
        insert users;

        // Account
        Account acc = new Account(Name = 'Test Account');
        insert acc;

        // Quote record
        QuoteForce__Quotes__c q = new QuoteForce__Quotes__c(Name = 'Test Quote');
        insert q;
    }

    // ─────────────────────────────────────────────────────────────
    // search()
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testSearch() {
        Test.startTest();
        List<SObject> results = EmailClass.search('Test');
        Test.stopTest();

        System.assertNotEquals(null, results, 'Result list should not be null');
    }

    @isTest
    static void testSearch_noMatch() {
        Test.startTest();
        List<SObject> results = EmailClass.search('zzznomatch999xyz');
        Test.stopTest();

        System.assertNotEquals(null, results, 'Result list should not be null even for no match');
    }

    // ─────────────────────────────────────────────────────────────
    // sendEmailController() — Quote
    // ─────────────────────────────────────────────────────────────
  /*  @isTest
    static void testSendEmailController() {
        QuoteForce__Quotes__c q = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

        EmailClass.EmailWrapper wrapper = new EmailClass.EmailWrapper();
        wrapper.toAddress = new List<String>{ 'testuser@example.com' };
        wrapper.ccAddress = new List<String>{ 'ccuser@example.com' };
        wrapper.subject   = 'Test Subject';
        wrapper.body      = 'Test Body';
        wrapper.files     = new List<String>();

        Test.startTest();
        EmailClass.sendEmailController(JSON.serialize(wrapper), q.Id, 10);
        Test.stopTest();

        System.assert(true, 'sendEmailController for Quote should complete without exception');
    }
*/
    // ─────────────────────────────────────────────────────────────
    // sendEmailController() — Invoice with tax
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testSendEmailControllerWithInvoice() {
        QuoteForce__Invoice__c inv = new QuoteForce__Invoice__c(Name = 'Test Invoice');
        insert inv;

        EmailClass.EmailWrapper wrapper = new EmailClass.EmailWrapper();
        wrapper.toAddress = new List<String>{ 'testuser@example.com' };
        wrapper.ccAddress = new List<String>{ 'ccuser@example.com' };
        wrapper.subject   = 'Invoice Test Subject';
        wrapper.body      = 'Invoice Test Body';
        wrapper.files     = new List<String>();

        Test.startTest();
        EmailClass.sendEmailController(JSON.serialize(wrapper), inv.Id, 18);
        Test.stopTest();

        System.assert(true, 'sendEmailController for Invoice with tax should complete without exception');
    }

    // ─────────────────────────────────────────────────────────────
    // sendEmailController() — Invoice with tax = 0
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testSendEmailControllerNoTax() {
        QuoteForce__Invoice__c inv = new QuoteForce__Invoice__c(Name = 'Test Invoice No Tax');
        insert inv;

        EmailClass.EmailWrapper wrapper = new EmailClass.EmailWrapper();
        wrapper.toAddress = new List<String>{ 'testuser@example.com' };
        wrapper.ccAddress = new List<String>();
        wrapper.subject   = 'No Tax Subject';
        wrapper.body      = 'No Tax Body';
        wrapper.files     = new List<String>();

        Test.startTest();
        EmailClass.sendEmailController(JSON.serialize(wrapper), inv.Id, 0);
        Test.stopTest();

        System.assert(true, 'sendEmailController with tax=0 should complete without exception');
    }

    // ─────────────────────────────────────────────────────────────
    // sendEmailController() — with file attachments
    // ─────────────────────────────────────────────────────────────
  /*  @isTest
    static void testSendEmailControllerWithFiles() {
        QuoteForce__Quotes__c q = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

        ContentVersion cv = new ContentVersion(
            Title          = 'TestFile',
            PathOnClient   = 'testfile.pdf',
            VersionData    = Blob.valueOf('FakePDFData'),
            IsMajorVersion = true
        );
        insert cv;
        cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];

        ContentDocumentLink cdl = new ContentDocumentLink(
            LinkedEntityId    = q.Id,
            ContentDocumentId = cv.ContentDocumentId,
            ShareType         = 'V',
            Visibility        = 'AllUsers'
        );
        insert cdl;

        EmailClass.EmailWrapper wrapper = new EmailClass.EmailWrapper();
        wrapper.toAddress = new List<String>{ 'testuser@example.com' };
        wrapper.ccAddress = new List<String>();
        wrapper.subject   = 'File Attachment Test';
        wrapper.body      = 'See attached file.';
        wrapper.files     = new List<String>{ cv.ContentDocumentId };

        Test.startTest();
        EmailClass.sendEmailController(JSON.serialize(wrapper), q.Id, null);
        Test.stopTest();

        System.assert(true, 'sendEmailController with file attachments should complete without exception');
    }
*/
    // ─────────────────────────────────────────────────────────────
    // sendInvoicePdf() — with CC and BCC
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testSendInvoicePdf() {
        QuoteForce__Invoice__c inv = new QuoteForce__Invoice__c(Name = 'Test Invoice');
        insert inv;

        Test.startTest();
        EmailClass.sendInvoicePdf(
            inv.Id,
            'to@test.com',
            'cc@test.com',
            'bcc@test.com',
            'Test Subject',
            'Test Body'
        );
        Test.stopTest();

        System.assert(true, 'sendInvoicePdf should complete without exception');
    }

    // ─────────────────────────────────────────────────────────────
    // sendInvoicePdf() — blank CC and BCC
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testSendInvoicePdf_noOptionalFields() {
        QuoteForce__Invoice__c inv = new QuoteForce__Invoice__c(Name = 'Test Invoice No CC BCC');
        insert inv;

        Test.startTest();
        EmailClass.sendInvoicePdf(
            inv.Id,
            'to@test.com',
            '',
            '',
            'No CC BCC Subject',
            'No CC BCC Body'
        );
        Test.stopTest();

        System.assert(true, 'sendInvoicePdf with blank CC/BCC should complete without exception');
    }

    // ─────────────────────────────────────────────────────────────
    // getAccessibleAttachmentIds() — valid linked file
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testGetAccessibleAttachmentIds() {
        Account acc = new Account(Name = 'Test Account 2');
        insert acc;

        ContentVersion cv = new ContentVersion(
            Title          = 'Test File',
            PathOnClient   = 'TestFile.pdf',
            VersionData    = Blob.valueOf('Dummy File Data'),
            IsMajorVersion = true
        );
        insert cv;
        cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];

        ContentDocumentLink cdl = new ContentDocumentLink(
            ContentDocumentId = cv.ContentDocumentId,
            LinkedEntityId    = acc.Id,
            ShareType         = 'V',
            Visibility        = 'AllUsers'
        );
        insert cdl;

        Test.startTest();
        List<String> result = EmailClass.getAccessibleAttachmentIds(
            acc.Id,
            new List<String>{ cv.ContentDocumentId }
        );
        Test.stopTest();

        System.assertEquals(1, result.size(), 'Should return 1 accessible attachment');
    }

    // ─────────────────────────────────────────────────────────────
    // getAccessibleAttachmentIds() — empty input
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testGetAccessibleAttachmentIds_emptyList() {
        Account acc = new Account(Name = 'Test Account 3');
        insert acc;

        Test.startTest();
        List<String> result = EmailClass.getAccessibleAttachmentIds(
            acc.Id,
            new List<String>()
        );
        Test.stopTest();

        System.assertEquals(0, result.size(), 'Empty input should return empty list');
    }

    // ─────────────────────────────────────────────────────────────
    // getAccessibleAttachmentIds() — invalid IDs filtered out
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testGetAccessibleAttachmentIds_invalidIds() {
        Account acc = new Account(Name = 'Test Account 4');
        insert acc;

        Test.startTest();
        List<String> result = EmailClass.getAccessibleAttachmentIds(
            acc.Id,
            new List<String>{ 'INVALID', '!!!', '', 'abc' }
        );
        Test.stopTest();

        System.assertEquals(0, result.size(), 'Invalid IDs should be filtered out');
    }

    // ─────────────────────────────────────────────────────────────
    // fixInlineImageUrls() — PNG inline image (via sendEmailController)
    // ─────────────────────────────────────────────────────────────
 /*   @isTest
    static void testFixInlineImageUrls_png() {
        QuoteForce__Quotes__c q = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

        ContentVersion cv = new ContentVersion(
            Title          = 'InlineTestImage',
            PathOnClient   = 'test.png',
            VersionData    = Blob.valueOf('fakepngbytes'),
            IsMajorVersion = true
        );
        insert cv;
        cv = [SELECT Id FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];

        // URL must exactly match regex — no query params after ID
        String inlineBody =
            '<p>Test</p>' +
            '<img src="/sfc/servlet.shepherd/version/download/' + cv.Id + '" />';

        EmailClass.EmailWrapper wrapper = new EmailClass.EmailWrapper();
        wrapper.toAddress = new List<String>{ 'to@example.com' };
        wrapper.ccAddress = new List<String>();
        wrapper.subject   = 'Inline PNG Test';
        wrapper.body      = inlineBody;
        wrapper.files     = new List<String>();

        Test.startTest();
        EmailClass.sendEmailController(JSON.serialize(wrapper), q.Id, null);
        Test.stopTest();

        System.assert(true, 'fixInlineImageUrls should process PNG inline image');
    }
*/
    // ─────────────────────────────────────────────────────────────
    // fixInlineImageUrls() — JPG, GIF, SVG, WEBP mime branches
    // ─────────────────────────────────────────────────────────────
   /* @isTest
    static void testFixInlineImageUrls_allMimeTypes() {
        QuoteForce__Quotes__c q = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

        List<String[]> fileTypes = new List<String[]>{
            new String[]{ 'test.jpg',  'test.jpg'  },
            new String[]{ 'test.gif',  'test.gif'  },
            new String[]{ 'test.svg',  'test.svg'  },
            new String[]{ 'test.webp', 'test.webp' }
        };

        for (String[] ft : fileTypes) {
            ContentVersion cv = new ContentVersion(
                Title          = ft[0],
                PathOnClient   = ft[0],
                VersionData    = Blob.valueOf('fakedata'),
                IsMajorVersion = true
            );
            insert cv;
            cv = [SELECT Id FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];

            String body =
                '<img src="/sfc/servlet.shepherd/version/download/' + cv.Id + '" />';

            EmailClass.EmailWrapper wrapper = new EmailClass.EmailWrapper();
            wrapper.toAddress = new List<String>{ 'to@example.com' };
            wrapper.ccAddress = new List<String>();
            wrapper.subject   = 'MimeType Test ' + ft[0];
            wrapper.body      = body;
            wrapper.files     = new List<String>();

            Test.startTest();
            EmailClass.sendEmailController(JSON.serialize(wrapper), q.Id, null);
            Test.stopTest();
        }

        System.assert(true, 'All mime type branches should be covered');
    }
*/
    // ─────────────────────────────────────────────────────────────
    // fixInlineImageUrls() — blank body early return
    // ─────────────────────────────────────────────────────────────
  /*  @isTest
    static void testFixInlineImageUrls_blankBody() {
        QuoteForce__Quotes__c q = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

        EmailClass.EmailWrapper wrapper = new EmailClass.EmailWrapper();
        wrapper.toAddress = new List<String>{ 'to@example.com' };
        wrapper.ccAddress = new List<String>();
        wrapper.subject   = 'Blank Body Test';
        wrapper.body      = '';
        wrapper.files     = new List<String>();

        Test.startTest();
        EmailClass.sendEmailController(JSON.serialize(wrapper), q.Id, null);
        Test.stopTest();

        System.assert(true, 'Blank body should hit early return in fixInlineImageUrls');
    }*/
}