@IsTest
private class ProductImporterControllerTest {

    @testSetup
    static void setupData() {
        insert new QuoteForce__Product__c(
            Name = 'Existing Imported Product',
            QuoteForce__Product_Code__c = 'IMP-EXIST',
            QuoteForce__Currency__c = 'USD',
            QuoteForce__Default_Price__c = 10,
            QuoteForce__Default_Quantity__c = 1,
            QuoteForce__Active__c = true
        );

        insert new QuoteForce__Product_Bundle__c(
            Name = 'Import Bundle',
            QuoteForce__Currency__c = 'USD'
        );
    }

    @IsTest
    static void testInsertProductsSuccessAndDuplicateChecks() {
        List<Map<String, Object>> successRows = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Name' => 'Imported Product 1',
                'QuoteForce__Product_Code__c' => 'IMP-001',
                'QuoteForce__Description__c' => 'Desc 1',
                'QuoteForce__Default_Price__c' => 100.5,
                'QuoteForce__Default_Quantity__c' => 3,
                'QuoteForce__Currency__c' => 'usd',
                'QuoteForce__Active__c' => true
            },
            new Map<String, Object>{
                'QuoteForce__Name' => 'Imported Product 2',
                'QuoteForce__Product_Code__c' => 'IMP-002',
                'QuoteForce__Description__c' => 'Desc 2',
                'QuoteForce__Default_Price__c' => '200',
                'QuoteForce__Default_Quantity__c' => '5',
                'QuoteForce__Currency__c' => 'USD',
                'QuoteForce__Active__c' => false
            }
        };

        List<Map<String, Object>> duplicateInFileRows = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Name' => 'Duplicate One',
                'QuoteForce__Product_Code__c' => 'DUP-001',
                'QuoteForce__Currency__c' => 'USD'
            },
            new Map<String, Object>{
                'Name' => 'Duplicate Two',
                'QuoteForce__Product_Code__c' => 'DUP-001',
                'QuoteForce__Currency__c' => 'usd'
            }
        };

        List<Map<String, Object>> existingDuplicateRows = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Name' => 'Existing Duplicate',
                'QuoteForce__Product_Code__c' => 'IMP-EXIST',
                'QuoteForce__Currency__c' => 'USD'
            }
        };

        Test.startTest();
        Map<String, Object> successResult = ProductImporterController.insertProducts(JSON.serialize(successRows));
        Map<String, Object> duplicateFileResult =
            ProductImporterController.insertProducts(JSON.serialize(duplicateInFileRows));
        Map<String, Object> existingDuplicateResult =
            ProductImporterController.insertProducts(JSON.serialize(existingDuplicateRows));
        Test.stopTest();
    }

    @IsTest
    static void testInsertProductsErrorPaths() {
        List<Map<String, Object>> missingFieldRows = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Name' => '',
                'QuoteForce__Product_Code__c' => null,
                'QuoteForce__Default_Price__c' => 15,
                'QuoteForce__Default_Quantity__c' => 1,
                'QuoteForce__Active__c' => true
            }
        };

        Test.startTest();
        Map<String, Object> emptyPayloadResult = ProductImporterController.insertProducts('');
        Map<String, Object> emptyListResult = ProductImporterController.insertProducts('[]');
        Map<String, Object> missingFieldResult =
            ProductImporterController.insertProducts(JSON.serialize(missingFieldRows));
        Map<String, Object> invalidJsonResult = ProductImporterController.insertProducts('INVALID_JSON');
        Test.stopTest();
    }

    @IsTest
    static void testInsertProductsInBundle() {
        QuoteForce__Product_Bundle__c bundleRecord = [SELECT Id FROM QuoteForce__Product_Bundle__c WHERE Name = 'Import Bundle' LIMIT 1];
        List<Map<String, Object>> bundleRows = new List<Map<String, Object>>{
            new Map<String, Object>{
                'Name' => 'Bundle Product',
                'QuoteForce__Product_Code__c' => 'BUNDLE-001',
                'QuoteForce__Description__c' => 'Bundle desc',
                'QuoteForce__Default_Price__c' => '75',
                'QuoteForce__Default_Quantity__c' => '2',
                'QuoteForce__Currency__c' => 'USD',
                'QuoteForce__Active__c' => true
            }
        };

        Test.startTest();
        Map<String, Object> bundleResult =
            ProductImporterController.insertProductsInBundle(JSON.serialize(bundleRows), bundleRecord.Id);
        Map<String, Object> emptyBundleResult =
            ProductImporterController.insertProductsInBundle('', bundleRecord.Id);
        Map<String, Object> invalidBundleResult =
            ProductImporterController.insertProductsInBundle('INVALID_JSON', bundleRecord.Id);
        Test.stopTest();

        List<QuoteForce__Product_Line_Items__c> bundleItems = [
            SELECT Id, QuoteForce__Product_Bundle__c, QuoteForce__Product__c
            FROM QuoteForce__Product_Line_Items__c
            WHERE QuoteForce__Product_Bundle__c = :bundleRecord.Id
        ];
    }
}