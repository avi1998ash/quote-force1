@IsTest(isParallel=false)
public class ProductConfigureController_Test {
    
    @testSetup
    static void setupData() {
        QuoteForce__Product__c usdProduct = new QuoteForce__Product__c(
            Name = 'Configured Product',
            QuoteForce__Product_Code__c = 'PC-001',
            QuoteForce__Description__c = 'Configured description',
            QuoteForce__Default_Price__c = 100,
            QuoteForce__Default_Quantity__c = 1,
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Active__c = true
        );
        insert usdProduct;
        
        QuoteForce__Product_Bundle__c usdBundle = new QuoteForce__Product_Bundle__c(
            Name = 'Configured Bundle',
            QuoteForce__Description__c = 'Bundle description',
            QuoteForce__Currency__c = 'USD'
        );
        insert usdBundle;
        
        insert new QuoteForce__Product_Line_Items__c(
            QuoteForce__Product__c = usdProduct.Id,
            QuoteForce__Product_Bundle__c = usdBundle.Id,
            QuoteForce__Quantity__c = 2,
            QuoteForce__Price__c = 50,
            QuoteForce__Currency__c = 'USD'
        );
        
        QuoteForce__Price_Book__c oldDefault = new QuoteForce__Price_Book__c(
            Name = 'Old Default Book',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Is_Active__c = true,
            QuoteForce__Is_Default__c = true
        );
        QuoteForce__Price_Book__c sourceBook = new QuoteForce__Price_Book__c(
            Name = 'Source Book',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Is_Active__c = true,
            QuoteForce__Is_Default__c = false
        );
        QuoteForce__Price_Book__c targetBook = new QuoteForce__Price_Book__c(
            Name = 'Target Book',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Is_Active__c = true,
            QuoteForce__Is_Default__c = false
        );
        insert new List<QuoteForce__Price_Book__c>{ oldDefault, sourceBook, targetBook };
            
            insert new QuoteForce__Price_Book_Entry__c(
                QuoteForce__Price_Book__c = sourceBook.Id,
                QuoteForce__Product__c = usdProduct.Id,
                QuoteForce__Product_Code__c = 'PC-001',
                QuoteForce__Currency__c = 'USD',
                QuoteForce__Unit_Price__c = 125,
                QuoteForce__Is_Active__c = true
            );
    }
    
    @IsTest
    static void testProductInsertAndUpdateMethods() {
        QuoteForce__Product__c insertCandidate = new QuoteForce__Product__c(
            Name = 'Insert Product',
            QuoteForce__Product_Code__c = 'PC-002',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Active__c = true
        );
        QuoteForce__Product__c existingProduct = [
            SELECT Id, Name, QuoteForce__Product_Code__c, QuoteForce__Currency__c
            FROM QuoteForce__Product__c
            WHERE QuoteForce__Product_Code__c = 'PC-001'
            LIMIT 1
        ];
        
        Test.startTest();
        QuoteForce__Product__c insertedProduct = ProductConfigureController.insertProduct(insertCandidate);
        existingProduct.Name = 'Configured Product Updated';
        QuoteForce__Product__c updatedProduct = ProductConfigureController.updateProduct(existingProduct);
        QuoteForce__Product__c selectedUpdatedProduct = ProductConfigureController.selectedUpdateProduct(existingProduct);
        try {
            ProductConfigureController.insertProduct(new QuoteForce__Product__c(Name = 'Missing Code'));
        } catch (Exception ex) {
        }
        try {
            ProductConfigureController.insertProduct(new QuoteForce__Product__c(
                Name = 'Duplicate Product',
                QuoteForce__Product_Code__c = 'PC-001',
                QuoteForce__Currency__c = 'USD'
            ));
        } catch (Exception ex) {
        }
        Test.stopTest();
    }
    
    @IsTest
    static void testBundleAndLineItemMethods() {
        QuoteForce__Product__c productRecord = [SELECT Id FROM QuoteForce__Product__c WHERE QuoteForce__Product_Code__c = 'PC-001' LIMIT 1];
        QuoteForce__Product_Bundle__c bundleRecord = [SELECT Id FROM QuoteForce__Product_Bundle__c WHERE Name = 'Configured Bundle' LIMIT 1];
        
        QuoteForce__Product_Line_Items__c lineOne = new QuoteForce__Product_Line_Items__c(
            QuoteForce__Product__c = productRecord.Id,
            QuoteForce__Product_Bundle__c = bundleRecord.Id,
            QuoteForce__Quantity__c = 1,
            QuoteForce__Price__c = 10
        );
        QuoteForce__Product_Line_Items__c lineTwo = new QuoteForce__Product_Line_Items__c(
            QuoteForce__Product__c = productRecord.Id,
            QuoteForce__Product_Bundle__c = bundleRecord.Id,
            QuoteForce__Quantity__c = 3,
            QuoteForce__Price__c = 30
        );
        
        Test.startTest();
        QuoteForce__Product_Bundle__c insertedBundle = ProductConfigureController.insertProductBundle(
            new QuoteForce__Product_Bundle__c(Name = 'Trim Bundle', QuoteForce__Currency__c = ' usd ')
        );
        try {
            ProductConfigureController.insertProductBundle(new QuoteForce__Product_Bundle__c());
        } catch (Exception ex) {
        }
        List<QuoteForce__Product_Line_Items__c> insertedLines = ProductConfigureController.insertProductLineItm(
            new List<QuoteForce__Product_Line_Items__c>{ lineOne, lineTwo }
        );
        QuoteForce__Product_Line_Items__c insertedSingle = ProductConfigureController.insertProductLineItmSingle(
            new QuoteForce__Product_Line_Items__c(
                QuoteForce__Product__c = productRecord.Id,
                QuoteForce__Product_Bundle__c = bundleRecord.Id,
                QuoteForce__Quantity__c = 5,
                QuoteForce__Price__c = 60
            )
        );
        List<QuoteForce__Product_Line_Items__c> loadedLines = ProductConfigureController.GetProductLineItm(bundleRecord.Id);
        insertedSingle.QuoteForce__Quantity__c = 9;
        QuoteForce__Product_Line_Items__c updatedLine = ProductConfigureController.updateProductLineItems(insertedSingle);
        Test.stopTest();
    }
    
    @IsTest
    static void testSearchAndDeleteMethods() {
        QuoteForce__Product__c deletableProduct = new QuoteForce__Product__c(
            Name = 'Delete Product',
            QuoteForce__Product_Code__c = 'PC-DELETE',
            QuoteForce__Currency__c = 'USD'
        );
        insert deletableProduct;
        
        QuoteForce__Product_Bundle__c deletableBundle = new QuoteForce__Product_Bundle__c(
            Name = 'Delete Bundle',
            QuoteForce__Currency__c = 'USD'
        );
        insert deletableBundle;
        
        QuoteForce__Product_Line_Items__c deletableLine = new QuoteForce__Product_Line_Items__c(
            QuoteForce__Product__c = [SELECT Id FROM QuoteForce__Product__c WHERE QuoteForce__Product_Code__c = 'PC-001' LIMIT 1].Id,
            QuoteForce__Product_Bundle__c = deletableBundle.Id,
            QuoteForce__Quantity__c = 2,
            QuoteForce__Price__c = 20
        );
        insert deletableLine;
        
        Test.startTest();
        List<QuoteForce__Product__c> foundProducts = ProductConfigureController.GetProducts('Configured', 'USD');
        List<QuoteForce__Product__c> allCurrencyProducts = ProductConfigureController.GetProducts('', null);
        Boolean hasChildren = ProductConfigureController.hasChildRecords(
            [SELECT Id FROM QuoteForce__Product__c WHERE QuoteForce__Product_Code__c = 'PC-001' LIMIT 1].Id
        );
        String deleteProductResult = ProductConfigureController.deleteProduct(deletableProduct.Id);
        String deleteBundleResult = ProductConfigureController.deleteProductBundle(deletableBundle.Id);
        Boolean deleteLineResult = ProductConfigureController.deleteProductLineItems(
            [SELECT Id FROM QuoteForce__Product_Line_Items__c LIMIT 1].Id
        );
        List<ProductConfigureController.ProductBundleWrapper> wrappedBySearch =
            ProductConfigureController.GetProductsBundle('Configured', 'USD');
        List<ProductConfigureController.ProductBundleWrapper> wrappedByCurrency =
            ProductConfigureController.GetProductsBundle(null, 'USD');
        List<ProductConfigureController.ProductBundleWrapper> wrappedBySearchOnly =
            ProductConfigureController.GetProductsBundle('Bundle', null);
        List<ProductConfigureController.ProductBundleWrapper> wrappedAll =
            ProductConfigureController.GetProductsBundle(null, null);
        Test.stopTest();
    }
    
    @IsTest
    static void testFileUploadMethods() {
        QuoteForce__Product__c productRecord = [SELECT Id FROM QuoteForce__Product__c WHERE QuoteForce__Product_Code__c = 'PC-001' LIMIT 1];
        String base64Data = EncodingUtil.base64Encode(Blob.valueOf('sample file'));
        
        Test.startTest();
        Id uploadedDocumentId = ProductConfigureController.uploadFile(base64Data, 'sample.txt', productRecord.Id);
        ProductConfigureController.deleteFile(productRecord.Id);
        Id contentVersionId = ProductConfigureController.uploadFileToProduct(productRecord.Id, base64Data, 'again.txt');
        try {
            ProductConfigureController.uploadFile(null, 'bad.txt', productRecord.Id);
        } catch (Exception ex) {
        }
        try {
            ProductConfigureController.uploadFileToProduct(productRecord.Id, null, 'bad.txt');
        } catch (Exception ex) {
        }
        Test.stopTest();
    }
    
    @IsTest
    static void testPriceBookMethods() {
        QuoteForce__Price_Book__c sourceBook = [SELECT Id FROM QuoteForce__Price_Book__c WHERE Name = 'Source Book' LIMIT 1];
        QuoteForce__Price_Book__c targetBook = [SELECT Id FROM QuoteForce__Price_Book__c WHERE Name = 'Target Book' LIMIT 1];
        QuoteForce__Product__c productRecord = [SELECT Id FROM QuoteForce__Product__c WHERE QuoteForce__Product_Code__c = 'PC-001' LIMIT 1];
        
        Test.startTest();
        List<QuoteForce__Price_Book__c> listedBooks = ProductConfigureController.listPriceBooks('Book', 'USD', true);
        QuoteForce__Price_Book__c upsertedBook = ProductConfigureController.upsertPriceBook(new QuoteForce__Price_Book__c(
            Name = 'Fresh Default Book',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Is_Active__c = true,
            QuoteForce__Is_Default__c = true
        ));
        List<QuoteForce__Price_Book_Entry__c> listedEntries =
            ProductConfigureController.listPriceBookEntries('PC-001', sourceBook.Id, null, 'USD', true);
        List<QuoteForce__Price_Book_Entry__c> entriesByProduct =
            ProductConfigureController.getPriceBookEntriesByProduct(productRecord.Id);
        List<QuoteForce__Price_Book_Entry__c> entriesByBook =
            ProductConfigureController.getPriceBookEntriesByPriceBook(sourceBook.Id);
        QuoteForce__Price_Book_Entry__c createdEntry = ProductConfigureController.upsertPriceBookEntry(new QuoteForce__Price_Book_Entry__c(
            QuoteForce__Price_Book__c = targetBook.Id,
            QuoteForce__Product__c = productRecord.Id,
            QuoteForce__Unit_Price__c = 210,
            QuoteForce__Is_Active__c = true
        ));
        try {
            ProductConfigureController.upsertPriceBookEntry(new QuoteForce__Price_Book_Entry__c(
                QuoteForce__Price_Book__c = targetBook.Id,
                QuoteForce__Product__c = productRecord.Id,
                QuoteForce__Unit_Price__c = 211,
                QuoteForce__Is_Active__c = true
            ));
        } catch (Exception ex) {
        }
        Integer clonedCount = ProductConfigureController.clonePriceBookEntries(sourceBook.Id, targetBook.Id, true);
        Boolean deletedEntry = ProductConfigureController.deletePriceBookEntry(createdEntry.Id);
        Boolean deletedBook = ProductConfigureController.deletePriceBook(
            [SELECT Id FROM QuoteForce__Price_Book__c WHERE Name = 'Fresh Default Book' LIMIT 1].Id
        );
        try {
            ProductConfigureController.clonePriceBookEntries(sourceBook.Id, sourceBook.Id, false);
        } catch (Exception ex) {
        }
        try {
            ProductConfigureController.upsertPriceBook(new QuoteForce__Price_Book__c(
                Name = 'Inactive Default',
                QuoteForce__Currency__c = 'USD',
                QuoteForce__Is_Active__c = false,
                QuoteForce__Is_Default__c = true
            ));
        } catch (Exception ex) {
        }
        Test.stopTest();
    }
    
    @IsTest
    static void testCreateProductWithPricing() {
        QuoteForce__Price_Book__c existingBook = [SELECT Id, QuoteForce__Currency__c FROM QuoteForce__Price_Book__c WHERE Name = 'Source Book' LIMIT 1];
        
        QuoteForce__Product__c productCandidate = new QuoteForce__Product__c(
            Name = 'Unified Product',
            QuoteForce__Product_Code__c = 'PC-UNIFIED',
            QuoteForce__Description__c = 'Created with pricing rows',
            QuoteForce__Default_Price__c = 320,
            QuoteForce__Default_Quantity__c = 1,
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Active__c = true
        );
        
        ProductConfigureController.DraftPriceBookRequest draftBook =
            new ProductConfigureController.DraftPriceBookRequest();
        draftBook.Name = 'Inline Draft Book';
        draftBook.description = 'Draft description';
        draftBook.currencyCode = 'USD';
        draftBook.isActive = true;
        draftBook.isDefault = false;
        
        ProductConfigureController.ProductPricingRequest existingRow =
            new ProductConfigureController.ProductPricingRequest();
        existingRow.priceBookId = existingBook.Id;
        existingRow.unitPrice = 325;
        existingRow.isActive = true;
        existingRow.currencyCode = existingBook.QuoteForce__Currency__c;
        
        ProductConfigureController.ProductPricingRequest draftRow =
            new ProductConfigureController.ProductPricingRequest();
        draftRow.unitPrice = 315;
        draftRow.isActive = true;
        draftRow.currencyCode = 'USD';
        draftRow.draftPriceBook = draftBook;
        
        Test.startTest();
        ProductConfigureController.CreateProductWithPricingResult result =
            ProductConfigureController.createProductWithPricing(
                productCandidate,
                new List<ProductConfigureController.ProductPricingRequest>{ existingRow, draftRow }
            );
        Test.stopTest();
        
        
        List<QuoteForce__Price_Book_Entry__c> savedEntries = [
            SELECT Id, QuoteForce__Price_Book__r.Name, QuoteForce__Product__r.QuoteForce__Product_Code__c, QuoteForce__Unit_Price__c
            FROM QuoteForce__Price_Book_Entry__c
            WHERE QuoteForce__Product__c = :result.productRecord.Id
            WITH USER_MODE
            ORDER BY QuoteForce__Unit_Price__c DESC
            
        ];
        
        try {
            ProductConfigureController.ProductPricingRequest duplicateRow =
                new ProductConfigureController.ProductPricingRequest();
            duplicateRow.priceBookId = existingBook.Id;
            duplicateRow.unitPrice = 100;
            duplicateRow.isActive = true;
            
            ProductConfigureController.createProductWithPricing(
                new QuoteForce__Product__c(
                    Name = 'Broken Product',
                    QuoteForce__Product_Code__c = 'PC-BROKEN',
                    QuoteForce__Currency__c = 'USD',
                    QuoteForce__Active__c = true
                ),
                new List<ProductConfigureController.ProductPricingRequest>{ existingRow, duplicateRow }
            );
            
        } catch (Exception ex) {
            
        }
    }
    
@IsTest
static void testUpdateProductWithPricing() {

    // ── Shared data ───────────────────────────────────────────────────────
    QuoteForce__Product__c existingProduct = [
        SELECT Id, Name, QuoteForce__Product_Code__c, QuoteForce__Currency__c, 
               QuoteForce__Default_Price__c, QuoteForce__Default_Quantity__c, QuoteForce__Active__c
        FROM QuoteForce__Product__c
        WHERE QuoteForce__Product_Code__c = 'PC-001'
        LIMIT 1
    ];

    QuoteForce__Price_Book__c sourceBook = [
        SELECT Id, QuoteForce__Currency__c
        FROM QuoteForce__Price_Book__c
        WHERE Name = 'Source Book'
        LIMIT 1
    ];

    QuoteForce__Price_Book_Entry__c existingEntry = [
        SELECT Id
        FROM QuoteForce__Price_Book_Entry__c
        WHERE QuoteForce__Price_Book__c = :sourceBook.Id
        AND QuoteForce__Product__c = :existingProduct.Id
        LIMIT 1
    ];

    // Negative tests ke liye alag product insert karo
    // PC-001 se alag code rakho — duplicate validation avoid karne ke liye
    QuoteForce__Product__c negativeTestProduct = new QuoteForce__Product__c(
        Name            = 'Negative Test Product',
        QuoteForce__Product_Code__c = 'PC-NEG',
        QuoteForce__Currency__c     = 'USD',
        QuoteForce__Active__c       = true,
        QuoteForce__Default_Price__c = 10,
        QuoteForce__Default_Quantity__c = 1
    );
    insert negativeTestProduct;

    // negativeTestProduct ke liye ek entry bhi chahiye
    // (validateUnifiedProductCreate: pricingRows empty nahi hone chahiye)
    QuoteForce__Price_Book_Entry__c negEntry = new QuoteForce__Price_Book_Entry__c(
        QuoteForce__Price_Book__c   = sourceBook.Id,
        QuoteForce__Product__c      = negativeTestProduct.Id,
        QuoteForce__Product_Code__c = 'PC-NEG',
        QuoteForce__Currency__c     = 'USD',
        QuoteForce__Unit_Price__c   = 50,
        QuoteForce__Is_Active__c    = true
    );
    insert negEntry;

    Test.startTest();

    // ── 1. NULL product → throws ──────────────────────────────────────────
    Boolean threw1 = false;
    try {
        ProductConfigureController.ProductPricingRequest dummyRow =
            new ProductConfigureController.ProductPricingRequest();
        dummyRow.priceBookId = sourceBook.Id;
        dummyRow.unitPrice   = 100;
        dummyRow.isActive    = true;
        ProductConfigureController.updateProductWithPricing(null,
            new List<ProductConfigureController.ProductPricingRequest>{ dummyRow });
    } catch (AuraHandledException e) {
        threw1 = true;
    }
    System.assert(threw1, 'Should throw for null product');

    // ── 2. Product without Id → throws ───────────────────────────────────
    Boolean threw2 = false;
    try {
        ProductConfigureController.ProductPricingRequest dummyRow =
            new ProductConfigureController.ProductPricingRequest();
        dummyRow.priceBookId = sourceBook.Id;
        dummyRow.unitPrice   = 100;
        dummyRow.isActive    = true;
        ProductConfigureController.updateProductWithPricing(
            new QuoteForce__Product__c(Name = 'No Id', QuoteForce__Product_Code__c = 'PC-NOID', QuoteForce__Currency__c = 'USD'),
            new List<ProductConfigureController.ProductPricingRequest>{ dummyRow }
        );
    } catch (AuraHandledException e) {
        threw2 = true;
    }
    System.assert(threw2, 'Should throw for product without Id');

    // ── 3. Empty pricing rows → throws ───────────────────────────────────
    Boolean threw3 = false;
    try {
        ProductConfigureController.updateProductWithPricing(
            negativeTestProduct,
            new List<ProductConfigureController.ProductPricingRequest>()
        );
    } catch (AuraHandledException e) {
        threw3 = true;
    }
    System.assert(threw3, 'Should throw for empty pricing rows');

    // ── 4. entryId belonging to different product → throws ───────────────
    Boolean threw4 = false;
    try {
        QuoteForce__Product__c otherProduct = new QuoteForce__Product__c(
            Name = 'Other Product', QuoteForce__Product_Code__c = 'PC-OTHER',
            QuoteForce__Currency__c = 'USD', QuoteForce__Active__c = true
        );
        insert otherProduct;

        QuoteForce__Price_Book_Entry__c foreignEntry = new QuoteForce__Price_Book_Entry__c(
            QuoteForce__Price_Book__c = sourceBook.Id, QuoteForce__Product__c = otherProduct.Id,
            QuoteForce__Product_Code__c = 'PC-OTHER', QuoteForce__Currency__c = 'USD',
            QuoteForce__Unit_Price__c = 99, QuoteForce__Is_Active__c = true
        );
        insert foreignEntry;

        ProductConfigureController.ProductPricingRequest badRow =
            new ProductConfigureController.ProductPricingRequest();
        badRow.entryId     = foreignEntry.Id;
        badRow.priceBookId = sourceBook.Id;
        badRow.unitPrice   = 50;
        badRow.isActive    = true;

        // negativeTestProduct use karo — PC-NEG code hai, clash nahi hoga
        ProductConfigureController.updateProductWithPricing(
            negativeTestProduct,
            new List<ProductConfigureController.ProductPricingRequest>{ badRow }
        );
    } catch (AuraHandledException e) {
        threw4 = true;
    }
    System.assert(threw4, 'Should throw for foreign entryId');

    // ── 5. Unit price zero → throws ──────────────────────────────────────
    Boolean threw5 = false;
    try {
        ProductConfigureController.ProductPricingRequest zeroRow =
            new ProductConfigureController.ProductPricingRequest();
        zeroRow.priceBookId = sourceBook.Id;
        zeroRow.unitPrice   = 0;
        zeroRow.isActive    = true;
        ProductConfigureController.updateProductWithPricing(
            negativeTestProduct,
            new List<ProductConfigureController.ProductPricingRequest>{ zeroRow }
        );
    } catch (AuraHandledException e) {
        threw5 = true;
    }
    System.assert(threw5, 'Should throw for zero unit price');

    // ── 6. Same priceBookId twice → throws ───────────────────────────────
    Boolean threw6 = false;
    try {
        ProductConfigureController.ProductPricingRequest dup1 =
            new ProductConfigureController.ProductPricingRequest();
        dup1.priceBookId = sourceBook.Id;
        dup1.unitPrice   = 100;
        dup1.isActive    = true;
        ProductConfigureController.ProductPricingRequest dup2 =
            new ProductConfigureController.ProductPricingRequest();
        dup2.priceBookId = sourceBook.Id;
        dup2.unitPrice   = 200;
        dup2.isActive    = true;
        ProductConfigureController.updateProductWithPricing(
            negativeTestProduct,
            new List<ProductConfigureController.ProductPricingRequest>{ dup1, dup2 }
        );
    } catch (AuraHandledException e) {
        threw6 = true;
    }
    System.assert(threw6, 'Should throw for duplicate priceBookId');

    // ── 7. Draft name already exists in DB → throws ───────────────────────
    Boolean threw7 = false;
    try {
        ProductConfigureController.DraftPriceBookRequest existingNameDraft =
            new ProductConfigureController.DraftPriceBookRequest();
        existingNameDraft.Name         = 'Source Book'; // already in @testSetup
        existingNameDraft.currencyCode = 'USD';
        existingNameDraft.isActive     = true;
        existingNameDraft.isDefault    = false;
        ProductConfigureController.ProductPricingRequest existingNameRow =
            new ProductConfigureController.ProductPricingRequest();
        existingNameRow.draftPriceBook = existingNameDraft;
        existingNameRow.unitPrice      = 100;
        existingNameRow.isActive       = true;
        ProductConfigureController.updateProductWithPricing(
            negativeTestProduct,
            new List<ProductConfigureController.ProductPricingRequest>{ existingNameRow }
        );
    } catch (AuraHandledException e) {
        threw7 = true;
    }
    System.assert(threw7, 'Should throw for draft name that already exists');

    // ── 8. Two draft rows both isDefault=true → throws ────────────────────
    Boolean threw8 = false;
    try {
        ProductConfigureController.DraftPriceBookRequest d1 =
            new ProductConfigureController.DraftPriceBookRequest();
        d1.Name = 'Multi Default 1'; d1.currencyCode = 'USD';
        d1.isActive = true; d1.isDefault = true;
        ProductConfigureController.DraftPriceBookRequest d2 =
            new ProductConfigureController.DraftPriceBookRequest();
        d2.Name = 'Multi Default 2'; d2.currencyCode = 'USD';
        d2.isActive = true; d2.isDefault = true;
        ProductConfigureController.ProductPricingRequest r1 =
            new ProductConfigureController.ProductPricingRequest();
        r1.draftPriceBook = d1; r1.unitPrice = 10; r1.isActive = true;
        ProductConfigureController.ProductPricingRequest r2 =
            new ProductConfigureController.ProductPricingRequest();
        r2.draftPriceBook = d2; r2.unitPrice = 20; r2.isActive = true;
        ProductConfigureController.updateProductWithPricing(
            negativeTestProduct,
            new List<ProductConfigureController.ProductPricingRequest>{ r1, r2 }
        );
    } catch (AuraHandledException e) {
        threw8 = true;
    }
    System.assert(threw8, 'Should throw for multiple default draft PBs');

    // ── 9. HAPPY PATH: retain + update existing entry ─────────────────────
    existingProduct.Name = 'Configured Product Edited';
    ProductConfigureController.ProductPricingRequest retainRow =
        new ProductConfigureController.ProductPricingRequest();
    retainRow.entryId      = existingEntry.Id;
    retainRow.priceBookId  = sourceBook.Id;
    retainRow.unitPrice    = 410;
    retainRow.isActive     = true;
    retainRow.currencyCode = 'USD';

    ProductConfigureController.CreateProductWithPricingResult result =
        ProductConfigureController.updateProductWithPricing(
            existingProduct,
            new List<ProductConfigureController.ProductPricingRequest>{ retainRow }
        );
    System.assertEquals(1, result.createdEntries.size(), 'One entry should remain');
    System.assertEquals(410,
        [SELECT QuoteForce__Unit_Price__c FROM QuoteForce__Price_Book_Entry__c WHERE Id = :existingEntry.Id].QuoteForce__Unit_Price__c,
        'Entry price should be updated to 410');

    // ── 10. HAPPY PATH: new draft price book created ──────────────────────
    QuoteForce__Product__c freshProduct = new QuoteForce__Product__c(
        Name = 'Fresh Product', QuoteForce__Product_Code__c = 'PC-FRESH',
        QuoteForce__Currency__c = 'USD', QuoteForce__Active__c = true,
        QuoteForce__Default_Price__c = 10, QuoteForce__Default_Quantity__c = 1
    );
    insert freshProduct;

    ProductConfigureController.DraftPriceBookRequest newDraft =
        new ProductConfigureController.DraftPriceBookRequest();
    newDraft.Name = 'Brand New Draft PB'; newDraft.currencyCode = 'USD';
    newDraft.isActive = true; newDraft.isDefault = false;

    ProductConfigureController.ProductPricingRequest draftRow =
        new ProductConfigureController.ProductPricingRequest();
    draftRow.draftPriceBook = newDraft;
    draftRow.unitPrice = 555;
    draftRow.isActive  = true;

    ProductConfigureController.CreateProductWithPricingResult draftResult =
        ProductConfigureController.updateProductWithPricing(
            freshProduct,
            new List<ProductConfigureController.ProductPricingRequest>{ draftRow }
        );
    System.assertEquals(1, draftResult.createdPriceBooks.size(),
        'One new draft PB should be created');
    System.assertEquals('Brand New Draft PB', draftResult.createdPriceBooks[0].Name);
    System.assertEquals(555, draftResult.createdEntries[0].QuoteForce__Unit_Price__c);

    // ── 11. HAPPY PATH: isDefault draft → clearOtherDefaultPriceBooks ─────
    QuoteForce__Product__c defaultProduct = new QuoteForce__Product__c(
        Name = 'Default PB Product', QuoteForce__Product_Code__c = 'PC-DEFPB',
        QuoteForce__Currency__c = 'USD', QuoteForce__Active__c = true,
        QuoteForce__Default_Price__c = 10, QuoteForce__Default_Quantity__c = 1
    );
    insert defaultProduct;

    ProductConfigureController.DraftPriceBookRequest defaultDraft =
        new ProductConfigureController.DraftPriceBookRequest();
    defaultDraft.Name = 'New Default PB'; defaultDraft.currencyCode = 'USD';
    defaultDraft.isActive = true; defaultDraft.isDefault = true;

    ProductConfigureController.ProductPricingRequest defaultDraftRow =
        new ProductConfigureController.ProductPricingRequest();
    defaultDraftRow.draftPriceBook = defaultDraft;
    defaultDraftRow.unitPrice = 777;
    defaultDraftRow.isActive  = true;

    ProductConfigureController.CreateProductWithPricingResult defaultResult =
        ProductConfigureController.updateProductWithPricing(
            defaultProduct,
            new List<ProductConfigureController.ProductPricingRequest>{ defaultDraftRow }
        );
    System.assertEquals(1, defaultResult.createdPriceBooks.size());
    System.assertEquals(true, defaultResult.createdPriceBooks[0].QuoteForce__Is_Default__c);

    Test.stopTest();
}

// ── Helper: returns a fake but syntactically valid Id that won't exist ────────
private static Id otherProductPriceBook() {
    return '0Dh000000000001AAA'; // fake QuoteForce__Price_Book__c Id format
}
    @IsTest
static void testUpdatePriceBookEntriesPrice() {
    QuoteForce__Product__c productRecord = [
        SELECT Id, QuoteForce__Currency__c
        FROM QuoteForce__Product__c
        WHERE QuoteForce__Product_Code__c = 'PC-001'
        LIMIT 1
    ];

    QuoteForce__Price_Book__c eurBook = new QuoteForce__Price_Book__c(
        Name = 'EUR Book',
        QuoteForce__Currency__c = 'EUR',
        QuoteForce__Is_Active__c = true,
        QuoteForce__Is_Default__c = false
    );
    insert eurBook;

    insert new QuoteForce__Price_Book_Entry__c(
        QuoteForce__Price_Book__c = eurBook.Id,
        QuoteForce__Product__c = productRecord.Id,
        QuoteForce__Product_Code__c = 'PC-001',
        QuoteForce__Currency__c = 'EUR',
        QuoteForce__Unit_Price__c = 200,
        QuoteForce__Is_Active__c = true
    );

    Test.startTest();

    // ✅ USD entries update honi chahiye
    ProductConfigureController.updatePriceBookEntriesPrice(productRecord.Id, 999, 'USD');

    // ✅ EUR entry untouched rehni chahiye
    ProductConfigureController.updatePriceBookEntriesPrice(productRecord.Id, 500, 'EUR');

    Test.stopTest();

    // USD PBE → 999 ho gai
    QuoteForce__Price_Book_Entry__c usdEntry = [
        SELECT QuoteForce__Unit_Price__c
        FROM QuoteForce__Price_Book_Entry__c
        WHERE QuoteForce__Product__c = :productRecord.Id
        AND QuoteForce__Currency__c = 'USD'
        LIMIT 1
    ];
    System.assertEquals(999, usdEntry.QuoteForce__Unit_Price__c, 'USD PBE price should be 999');

    // EUR PBE → 500 ho gai
    QuoteForce__Price_Book_Entry__c eurEntry = [
        SELECT QuoteForce__Unit_Price__c
        FROM QuoteForce__Price_Book_Entry__c
        WHERE QuoteForce__Product__c = :productRecord.Id
        AND QuoteForce__Currency__c = 'EUR'
        LIMIT 1
    ];
    System.assertEquals(500, eurEntry.QuoteForce__Unit_Price__c, 'EUR PBE price should be 500');
}
}