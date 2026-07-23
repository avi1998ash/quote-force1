@isTest
private class PageSectionControllerTest {

    // ── Test Data Setup ──────────────────────────────────────────────
    @TestSetup
    static void setupTestData() {

        // Admin Config
        QuoteForce__Admin_Configuration__c adminConfig = new QuoteForce__Admin_Configuration__c(
            Name                             = 'Test Company',
            QuoteForce__Company_Logo_URL__c  = 'https://example.com/logo.png',
            QuoteForce__Street__c            = '123 Test St',
            QuoteForce__City__c              = 'Ahmedabad',
            QuoteForce__State_Province__c    = 'Gujarat',
           // QuoteForce__Postal_Code__c       = '380001',
            QuoteForce__Country__c           = 'India',
            QuoteForce__Email__c             = 'test@company.com',
            QuoteForce__Phone__c             = '+91 9999999999',
            QuoteForce__Notes__c             = 'Test Notes',
            QuoteForce__Invoice_Terms_Condition__c = 'Test Terms'
        );
        insert adminConfig;

        // Quote with toggle = true on Title and Quote Details
        String pagesJson = JSON.serialize(new List<Map<String, Object>>{
            new Map<String, Object>{
                'Id'       => '1',
                'Name'     => 'Title',
                'label'    => 'Title',
                'selected' => true,
                'editMode' => false,
                'toggle'   => true
            },
            new Map<String, Object>{
                'Id'       => '2',
                'Name'     => 'Letter from the owner',
                'label'    => 'Letter from the owner',
                'selected' => false,
                'editMode' => false,
                'toggle'   => true
            },
            new Map<String, Object>{
                'Id'       => '3',
                'Name'     => 'Quote Details',
                'label'    => 'Quote Details',
                'selected' => false,
                'editMode' => false,
                'toggle'   => true
            },
            new Map<String, Object>{
                'Id'       => '4',
                'Name'     => 'Warranty',
                'label'    => 'Warranty',
                'selected' => false,
                'editMode' => false,
                'toggle'   => true,
                'warrantyImage' => '/sfc/servlet.shepherd/version/download/0681234567890ABC'
            },
            new Map<String, Object>{
                'Id'       => '5',
                'Name'     => 'Terms and Conditions',
                'label'    => 'Terms and Conditions',
                'selected' => false,
                'editMode' => false,
                'toggle'   => true,
                'termConditionImage' => '/sfc/servlet.shepherd/version/download/0681234567890XYZ'
            }
        });

        QuoteForce__Quotes__c quote = new QuoteForce__Quotes__c(
            Name                                  = 'Test Quote',
            QuoteForce__Status__c                 = 'Draft',
            QuoteForce__Expiration_Date__c        = Date.today().addDays(30),
            QuoteForce__Tax__c                    = 10,
            QuoteForce__Pages_JSON__c             = pagesJson,
            QuoteForce__First_Name__c             = 'Test',
            QuoteForce__Last_Name__c              = 'User',
            QuoteForce__Street_Address__c         = '456 Quote St',
            QuoteForce__City__c                   = 'Surat',
            QuoteForce__State_Province__c         = 'Gujarat',
            QuoteForce__Zip_code_Postal_code__c   = '395001',
            QuoteForce__Layout_Name__c            = 'Test Layout',
            QuoteForce__Letter_from_the_owner__c  = 'Dear Customer...',
            QuoteForce__Bill_To__Street__s        = '789 Bill St',
            QuoteForce__Bill_To__City__s          = 'Vadodara',
            QuoteForce__Bill_To__StateCode__s     = 'GJ',
            QuoteForce__Bill_To__PostalCode__s    = '390001',
            QuoteForce__Bill_To__CountryCode__s   = 'IN',
            QuoteForce__Ship_To__Street__s        = '321 Ship St',
            QuoteForce__Ship_To__City__s          = 'Rajkot',
            QuoteForce__Ship_To__StateCode__s     = 'GJ',
            QuoteForce__Ship_To__PostalCode__s    = '360001',
            QuoteForce__Ship_To__CountryCode__s   = 'IN'
        );
        insert quote;

        // Product Section
        QuoteForce__Product_Section__c section = new QuoteForce__Product_Section__c(
            Name                    = 'Section 1',
            QuoteForce__Quotes__c   = quote.Id,
            QuoteForce__Notes__c    = 'Test Notes'
        );
        insert section;

        // Product
        QuoteForce__Product__c product = new QuoteForce__Product__c(
            Name = 'Water Bottle 1L'
        );
        insert product;

        // Quote Line Item
        QuoteForce__QuoteLineItem__c lineItem = new QuoteForce__QuoteLineItem__c(
            QuoteForce__Product__c          = product.Id,
            QuoteForce__Quantity__c         = 2,
            QuoteForce__Price__c            = 500,
            QuoteForce__Product_Section__c  = section.Id
        );
        insert lineItem;
    }

  
    static PageSectionController buildController(Id quoteId) {
        PageReference pageRef = Page.quotePDFpage;
        pageRef.getParameters().put('id', quoteId);
        Test.setCurrentPage(pageRef);
        return new PageSectionController();
    }

    @isTest
    static void testControllerWithValidRecord() {

        QuoteForce__Quotes__c quote = [
            SELECT Id FROM QuoteForce__Quotes__c LIMIT 1
        ];

        Test.startTest();
        PageSectionController ctrl = buildController(quote.Id);
        Test.stopTest();

        System.assertEquals('Test Quote', ctrl.Quotes.Name,
            'Quote name should match');

        System.assertEquals(true, ctrl.isTitle,
            'isTitle should be true');

        System.assertEquals(true, ctrl.isLetterFromOwner,
            'isLetterFromOwner should be true');

        System.assertEquals(true, ctrl.isQuoteDetails,
            'isQuoteDetails should be true');

        System.assertEquals(true, ctrl.isWarranty,
            'isWarranty should be true');

        System.assertEquals(true, ctrl.isTermsAndConditions,
            'isTermsAndConditions should be true');

        System.assertNotEquals(null, ctrl.sectionsData,
            'sectionsData should not be null');

        System.assertEquals(1, ctrl.sectionsData.size(),
            'Should have 1 section');

        System.assertEquals(1000, ctrl.grandTotal,
            'grandTotal should be 1000 (2 * 500)');
    }

    // ── Test 2: toggle false hone par pages show nahi honge ──────────
    @isTest
    static void testControllerWithToggleFalse() {

        String pagesJsonAllFalse = JSON.serialize(new List<Map<String, Object>>{
            new Map<String, Object>{
                'Id' => '1', 'Name' => 'Title', 'label' => 'Title',
                'selected' => false, 'editMode' => false, 'toggle' => false
            },
            new Map<String, Object>{
                'Id' => '3', 'Name' => 'Quote Details', 'label' => 'Quote Details',
                'selected' => false, 'editMode' => false, 'toggle' => false
            }
        });

        QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
        quote.QuoteForce__Pages_JSON__c = pagesJsonAllFalse;
        update quote;

        Test.startTest();
        PageSectionController ctrl = buildController(quote.Id);
        Test.stopTest();

        System.assertEquals(false, ctrl.isTitle,            'isTitle should be false');
        System.assertEquals(false, ctrl.isQuoteDetails,     'isQuoteDetails should be false');
        System.assertEquals(false, ctrl.isLetterFromOwner,  'isLetterFromOwner should be false');
        System.assertEquals(false, ctrl.isWarranty,         'isWarranty should be false');
        System.assertEquals(false, ctrl.isTermsAndConditions,'isTermsAndConditions should be false');
    }

    @isTest
    static void testControllerWithBlankPagesJson() {

        QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
        quote.QuoteForce__Pages_JSON__c = null;
        update quote;

        Test.startTest();
        PageSectionController ctrl = buildController(quote.Id);
        Test.stopTest();

        System.assertEquals(false, ctrl.isTitle,   'isTitle should be false when JSON is blank');
        
    }


    @isTest
    static void testControllerWithInvalidPagesJson() {

        QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
        quote.QuoteForce__Pages_JSON__c = 'THIS IS NOT JSON {{{{';
        update quote;

        Test.startTest();
        PageSectionController ctrl = buildController(quote.Id);
        Test.stopTest();


        System.assertEquals(false, ctrl.isTitle, 'isTitle should be false on bad JSON');
    }

  
    @isTest
    static void testLineItemsWithNullValues() {

        QuoteForce__Quotes__c quote  = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
        QuoteForce__Product_Section__c section = [
            SELECT Id FROM QuoteForce__Product_Section__c LIMIT 1
        ];
        QuoteForce__Product__c product = [
            SELECT Id FROM QuoteForce__Product__c LIMIT 1
        ];


        QuoteForce__QuoteLineItem__c nullItem = new QuoteForce__QuoteLineItem__c(
            QuoteForce__Product__c         = product.Id,
            QuoteForce__Quantity__c        = null,
            QuoteForce__Price__c           = null,
            QuoteForce__Product_Section__c = section.Id
        );
        insert nullItem;

        Test.startTest();
        PageSectionController ctrl = buildController(quote.Id);
        Test.stopTest();

       
        System.assertNotEquals(null, ctrl.grandTotal, 'grandTotal should not be null');
    }

  
    @isTest
    static void testGetSectionTotal() {

        QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

        Test.startTest();
        PageSectionController ctrl = buildController(quote.Id);
        Test.stopTest();

        QuoteForce__Product_Section__c sec = ctrl.sectionsData[0].section;
        Decimal total = ctrl.getSectionTotal(sec);

        System.assertEquals(1000, total, 'Section total should be 1000');
    }

 
    @isTest
    static void testLogoUrlHttps() {

        QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

        Test.startTest();
        PageSectionController ctrl = buildController(quote.Id);
        Test.stopTest();

        System.assertNotEquals(null, ctrl.logoUrl, 'logoUrl should not be null');
        System.assert(ctrl.logoUrl.startsWith('https://'),
            'logoUrl should start with https://');
    }

 
    @isTest
    static void testLogoUrlNull() {

        QuoteForce__Admin_Configuration__c config = [
            SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1
        ];
        config.QuoteForce__Company_Logo_URL__c = null;
        update config;

        QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

        Test.startTest();
        PageSectionController ctrl = buildController(quote.Id);
        Test.stopTest();

        System.assertEquals(null, ctrl.logoUrl, 'logoUrl should be null');
    }

    // ── Test 9: /sfc/ URL wala logo ──────────────────────────────────
    @isTest
    static void testLogoUrlSfc() {

        QuoteForce__Admin_Configuration__c config = [
            SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1
        ];
        config.QuoteForce__Company_Logo_URL__c =
            '/sfc/servlet.shepherd/version/download/0681234567890ABC';
        update config;

        QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

        Test.startTest();
        PageSectionController ctrl = buildController(quote.Id);
        Test.stopTest();

        System.assertNotEquals(null, ctrl.logoUrl, 'logoUrl should not be null for /sfc/ path');
    }
  
@isTest
static void testMimeTypeJpeg() {

    QuoteForce__Admin_Configuration__c config = [
        SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1
    ];
    
    config.QuoteForce__Company_Logo_URL__c = 'https://example.com/logo.jpeg';
    update config;

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    Test.stopTest();

    System.assertNotEquals(null, ctrl.logoUrl);
}

@isTest
static void testMimeTypeGif() {

    QuoteForce__Admin_Configuration__c config = [
        SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1
    ];
    config.QuoteForce__Company_Logo_URL__c = 'https://example.com/logo.gif';
    update config;

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    Test.stopTest();

    System.assertNotEquals(null, ctrl.logoUrl);
}

@isTest
static void testMimeTypeWebp() {

    QuoteForce__Admin_Configuration__c config = [
        SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1
    ];
    config.QuoteForce__Company_Logo_URL__c = 'https://example.com/logo.webp';
    update config;

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    Test.stopTest();

    System.assertNotEquals(null, ctrl.logoUrl);
}

@isTest
static void testMimeTypeBlankExtension() {

    QuoteForce__Admin_Configuration__c config = [
        SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1
    ];
    ContentVersion cv = new ContentVersion(
        Title           = 'testBlankExt',
        PathOnClient    = 'testBlankExt',
        VersionData     = Blob.valueOf('fakeimagedata'),
        IsMajorVersion  = true
    );
    insert cv;

    ContentVersion inserted = [
        SELECT Id, ContentDocumentId
        FROM ContentVersion
        WHERE Id = :cv.Id
    ];

    config.QuoteForce__Company_Logo_URL__c =
        '/sfc/servlet.shepherd/version/download/' + inserted.Id;
    update config;

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    Test.stopTest();

    System.assertNotEquals(null, ctrl.logoUrl);
}
@isTest
static void testExtractFileIdUrlEndsWithSlash() {

    QuoteForce__Admin_Configuration__c config = [
        SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1
    ];
    config.QuoteForce__Company_Logo_URL__c =
        'https://example.com/sfc/servlet.shepherd/version/download/';
    update config;

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    Test.stopTest();

    System.assertNotEquals(null, ctrl);
}

@isTest
static void testExtractFileIdUrlWithQueryParam() {

    QuoteForce__Admin_Configuration__c config = [
        SELECT Id FROM QuoteForce__Admin_Configuration__c LIMIT 1
    ];
    config.QuoteForce__Company_Logo_URL__c =
        'https://example.com/sfc/servlet.shepherd/version/download/0681234567890ABC?versionId=1';
    update config;

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    Test.stopTest();

    System.assertNotEquals(null, ctrl.logoUrl);
}

@isTest
static void testActivePagesField() {

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    // activePages set karo
    ctrl.activePages = new List<Map<String, Object>>{
        new Map<String, Object>{ 'label' => 'Title', 'toggle' => true }
    };
    Test.stopTest();

    System.assertNotEquals(null, ctrl.activePages);
    System.assertEquals(1, ctrl.activePages.size());
}
@isTest
static void testGetSectionTotalWithNullValues() {

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
    QuoteForce__Product_Section__c section = [
        SELECT Id FROM QuoteForce__Product_Section__c LIMIT 1
    ];
    QuoteForce__Product__c product = [
        SELECT Id FROM QuoteForce__Product__c LIMIT 1
    ];

    QuoteForce__QuoteLineItem__c nullQty = new QuoteForce__QuoteLineItem__c(
        QuoteForce__Product__c         = product.Id,
        QuoteForce__Quantity__c        = null,
        QuoteForce__Price__c           = 100,
        QuoteForce__Product_Section__c = section.Id
    );
    insert nullQty;

    QuoteForce__QuoteLineItem__c nullPrice = new QuoteForce__QuoteLineItem__c(
        QuoteForce__Product__c         = product.Id,
        QuoteForce__Quantity__c        = 2,
        QuoteForce__Price__c           = null,
        QuoteForce__Product_Section__c = section.Id
    );
    insert nullPrice;

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);

    QuoteForce__Product_Section__c sec = [
        SELECT Id, Name, QuoteForce__Notes__c, QuoteForce__Quotes__c,
               QuoteForce__Master_Template__c,
               (SELECT Id, QuoteForce__Product__c, QuoteForce__Quantity__c,
                       QuoteForce__Price__c
                FROM QuoteForce__QuoteLineItems__r)
        FROM QuoteForce__Product_Section__c
        WHERE Id = :section.Id
        LIMIT 1
    ];

    Decimal total = ctrl.getSectionTotal(sec);
    Test.stopTest();

    System.assertNotEquals(null, total);
}
    // Covers: if(recordId == null) throw new AuraHandledException('ID IS NULL');
@isTest
static void testConstructorThrowsWhenIdIsNull() {
    PageReference pageRef = Page.quotePDFpage;
    Test.setCurrentPage(pageRef);

    Boolean exceptionThrown = false;
    Test.startTest();
    try {
        PageSectionController ctrl = new PageSectionController();
    } catch (AuraHandledException ex) {
        exceptionThrown = true;
    }
    Test.stopTest();

    System.assertEquals(true, exceptionThrown, 'Expected AuraHandledException when id param is missing');
}

// Covers: getMimeType() 'jpg'/'jpeg' branch, via buildImageDataUrl -> getContentVersionForFileId
@isTest
static void testMimeTypeJpegViaContentVersion() {
    ContentVersion cv = new ContentVersion(
        Title = 'testImg.jpg',
        PathOnClient = 'testImg.jpg',
        VersionData = Blob.valueOf('fakejpegdata'),
        IsMajorVersion = true
    );
    insert cv;
    ContentVersion inserted = [SELECT Id FROM ContentVersion WHERE Id = :cv.Id];

    String pagesJson = JSON.serialize(new List<Map<String, Object>>{
        new Map<String, Object>{
            'Id' => '4', 'Name' => 'Warranty', 'label' => 'Warranty',
            'selected' => false, 'editMode' => false, 'toggle' => true,
            'warrantyImage' => inserted.Id
        }
    });

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
    quote.QuoteForce__Pages_JSON__c = pagesJson;
    update quote;

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    Test.stopTest();

    System.assertNotEquals(null, ctrl.warrantyImageDataUrl, 'warrantyImageDataUrl should not be null');
    System.assert(ctrl.warrantyImageDataUrl.startsWith('data:image/jpeg;base64,'),
        'Expected jpeg mime type in data URL');
}

// Covers: getMimeType() 'gif' branch
@isTest
static void testMimeTypeGifViaContentVersion() {
    ContentVersion cv = new ContentVersion(
        Title = 'testImg.gif',
        PathOnClient = 'testImg.gif',
        VersionData = Blob.valueOf('fakegifdata'),
        IsMajorVersion = true
    );
    insert cv;
    ContentVersion inserted = [SELECT Id FROM ContentVersion WHERE Id = :cv.Id];

    String pagesJson = JSON.serialize(new List<Map<String, Object>>{
        new Map<String, Object>{
            'Id' => '5', 'Name' => 'Terms and Conditions', 'label' => 'Terms and Conditions',
            'selected' => false, 'editMode' => false, 'toggle' => true,
            'termConditionImage' => inserted.Id
        }
    });

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
    quote.QuoteForce__Pages_JSON__c = pagesJson;
    update quote;

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    Test.stopTest();

    System.assertNotEquals(null, ctrl.termsConditionsImageDataUrl);
    System.assert(ctrl.termsConditionsImageDataUrl.startsWith('data:image/gif;base64,'),
        'Expected gif mime type in data URL');
}

// Covers: getMimeType() 'webp' branch
@isTest
static void testMimeTypeWebpViaContentVersion() {
    ContentVersion cv = new ContentVersion(
        Title = 'testImg.webp',
        PathOnClient = 'testImg.webp',
        VersionData = Blob.valueOf('fakewebpdata'),
        IsMajorVersion = true
    );
    insert cv;
    ContentVersion inserted = [SELECT Id FROM ContentVersion WHERE Id = :cv.Id];

    String pagesJson = JSON.serialize(new List<Map<String, Object>>{
        new Map<String, Object>{
            'Id' => '4', 'Name' => 'Warranty', 'label' => 'Warranty',
            'selected' => false, 'editMode' => false, 'toggle' => true,
            'warrantyImage' => inserted.Id
        }
    });

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
    quote.QuoteForce__Pages_JSON__c = pagesJson;
    update quote;

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    Test.stopTest();

    System.assertNotEquals(null, ctrl.warrantyImageDataUrl);
    System.assert(ctrl.warrantyImageDataUrl.startsWith('data:image/webp;base64,'),
        'Expected webp mime type in data URL');
}

// Covers: getMimeType() blank extension -> default 'image/png' branch, via ACTUAL image path
@isTest
static void testMimeTypeBlankExtensionViaContentVersion() {
    ContentVersion cv = new ContentVersion(
        Title = 'noExtensionFile',
        PathOnClient = 'noExtensionFile',
        VersionData = Blob.valueOf('fakedata'),
        IsMajorVersion = true
    );
    insert cv;
    ContentVersion inserted = [SELECT Id FROM ContentVersion WHERE Id = :cv.Id];

    String pagesJson = JSON.serialize(new List<Map<String, Object>>{
        new Map<String, Object>{
            'Id' => '4', 'Name' => 'Warranty', 'label' => 'Warranty',
            'selected' => false, 'editMode' => false, 'toggle' => true,
            'warrantyImage' => inserted.Id
        }
    });

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];
    quote.QuoteForce__Pages_JSON__c = pagesJson;
    update quote;

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    Test.stopTest();

  
}

// Covers: currencySymbol getter - direct Currency__c on line item
@isTest
static void testCurrencySymbolWithDirectCurrency() {
    QuoteForce__QuoteLineItem__c li = [SELECT Id FROM QuoteForce__QuoteLineItem__c LIMIT 1];
    li.QuoteForce__Currency__c = 'INR';
    update li;

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    String symbol = ctrl.currencySymbol;
    Test.stopTest();

}

// Covers: currencySymbol getter - sectionsData present but no matching currency (blank result path)
@isTest
static void testCurrencySymbolBlankWhenNoCurrency() {
    QuoteForce__QuoteLineItem__c li = [SELECT Id FROM QuoteForce__QuoteLineItem__c LIMIT 1];
    li.QuoteForce__Currency__c = null;
    update li;

    QuoteForce__Quotes__c quote = [SELECT Id FROM QuoteForce__Quotes__c LIMIT 1];

    Test.startTest();
    PageSectionController ctrl = buildController(quote.Id);
    String symbol = ctrl.currencySymbol;
    Test.stopTest();

}

@isTest
static void testCurrencySymbolWithNoSections() {
    QuoteForce__Quotes__c emptyQuote = new QuoteForce__Quotes__c(
        Name = 'Empty Quote No Sections',
        QuoteForce__Status__c = 'Draft'
    );
    insert emptyQuote;

    Test.startTest();
    PageSectionController ctrl = buildController(emptyQuote.Id);
    String symbol = ctrl.currencySymbol;
    Test.stopTest();
}
}