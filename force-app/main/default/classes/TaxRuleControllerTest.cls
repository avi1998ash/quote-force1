@IsTest
private class TaxRuleControllerTest {

    @IsTest
    static void managesTaxRulesAndAdminSettings() {

        QuoteForce__Tax_Rule__c rule = TaxRuleController.saveTaxRule(
            new QuoteForce__Tax_Rule__c(
                Name = 'VAT 10',
                QuoteForce__Value__c = 10,
                QuoteForce__Country__c = 'United States',
                QuoteForce__Country_Code__c = 'US',
                QuoteForce__Applies_To__c = 'All',
                QuoteForce__Is_Default__c = true,
                QuoteForce__Active__c = true
            )
        );

        System.assertNotEquals(null, rule.Id);

        System.assertEquals(
            true,
            TaxRuleController.getDefaultTaxRule().QuoteForce__Is_Default__c
        );

        System.assertEquals(
            1,
            TaxRuleController.listActiveTaxRules().size()
        );

        QuoteForce__Admin_Configuration__c settings =
            TaxRuleController.getAdminTaxSettings();

        TaxRuleController.deleteTaxRule(rule.Id);

        System.assertEquals(
            0,
            [SELECT COUNT() FROM QuoteForce__Tax_Rule__c]
        );
    }

    @IsTest
    static void testListActiveTaxRules() {

        QuoteForce__Tax_Rule__c activeRule =
            new QuoteForce__Tax_Rule__c(
                Name = 'GST 18%',
                QuoteForce__Value__c = 18,
                QuoteForce__Country__c = 'India',
                QuoteForce__Country_Code__c = 'IN',
                QuoteForce__Active__c = true,
                QuoteForce__Is_Default__c = true
            );

        QuoteForce__Tax_Rule__c inactiveRule =
            new QuoteForce__Tax_Rule__c(
                Name = 'Old Tax',
                QuoteForce__Value__c = 10,
                QuoteForce__Country__c = 'India',
                QuoteForce__Country_Code__c = 'IN',
                QuoteForce__Active__c = false,
                QuoteForce__Is_Default__c = false
            );

        insert new List<QuoteForce__Tax_Rule__c>{
            activeRule,
            inactiveRule
        };

        Test.startTest();
        List<QuoteForce__Tax_Rule__c> result =
            TaxRuleController.listActiveTaxRules();
        Test.stopTest();

        System.assertEquals(
            1,
            result.size(),
            'Only active tax rule should be returned'
        );

        System.assertEquals(
            'GST 18%',
            result[0].Name,
            'Correct active rule should be returned'
        );

        System.assertEquals(
            true,
            result[0].QuoteForce__Active__c,
            'Returned record must be active'
        );
    }

    @IsTest
    static void testListTaxRules() {

        List<QuoteForce__Tax_Rule__c> testRules =
            new List<QuoteForce__Tax_Rule__c>();

        testRules.add(
            new QuoteForce__Tax_Rule__c(
                Name = 'Default Tax',
                QuoteForce__Is_Default__c = true,
                QuoteForce__Active__c = true,
                QuoteForce__Value__c = 18
            )
        );

        testRules.add(
            new QuoteForce__Tax_Rule__c(
                Name = 'Z Active Tax',
                QuoteForce__Is_Default__c = false,
                QuoteForce__Active__c = true,
                QuoteForce__Value__c = 5
            )
        );

        testRules.add(
            new QuoteForce__Tax_Rule__c(
                Name = 'A Inactive Tax',
                QuoteForce__Is_Default__c = false,
                QuoteForce__Active__c = false,
                QuoteForce__Value__c = 12
            )
        );

        insert testRules;

        Test.startTest();
        List<QuoteForce__Tax_Rule__c> result =
            TaxRuleController.listTaxRules();
        Test.stopTest();

        Assert.isNotNull(result, 'The list should not be null');

        Assert.areEqual(
            3,
            result.size(),
            'Should return all 3 test records'
        );

        Assert.areEqual(
            true,
            result[0].QuoteForce__Is_Default__c,
            'First record should be the Default rule'
        );

        Assert.areEqual('Default Tax', result[0].Name);

        Assert.areEqual(
            true,
            result[1].QuoteForce__Active__c,
            'Second record should be the Active rule'
        );

        Assert.areEqual('Z Active Tax', result[1].Name);

        Assert.areEqual(
            false,
            result[2].QuoteForce__Active__c,
            'Third record should be the Inactive rule'
        );

        Assert.areEqual('A Inactive Tax', result[2].Name);
    }

    @IsTest
    static void testSaveTaxRuleNegativeScenarios() {

        try {

            Test.startTest();
            TaxRuleController.saveTaxRule(null);
            Test.stopTest();

            Assert.fail(
                'Should have thrown an AuraHandledException for null payload'
            );

        } catch (AuraHandledException e) {

            Assert.isTrue(
                e.getMessage().contains('Script-thrown exception'),
                'Exception should be thrown'
            );
        }

        QuoteForce__Tax_Rule__c ruleWithoutName =
            new QuoteForce__Tax_Rule__c(
                QuoteForce__Active__c = true
            );

        try {

            TaxRuleController.saveTaxRule(ruleWithoutName);

            Assert.fail(
                'Should have thrown an AuraHandledException for missing Name'
            );

        } catch (AuraHandledException e) {

            Assert.isTrue(
                e.getMessage().contains('Script-thrown exception'),
                'Exception should be thrown for empty Name'
            );
        }
    }

    @IsTest
    static void testSaveTaxRuleDefaultValues() {

        QuoteForce__Tax_Rule__c minimalRule =
            new QuoteForce__Tax_Rule__c(
                Name = 'Minimal Rule'
            );

        Test.startTest();

        QuoteForce__Tax_Rule__c savedRule =
            TaxRuleController.saveTaxRule(minimalRule);

        Test.stopTest();

        // Assert.areEqual(
        //     'Percentage',
        //     savedRule.QuoteForce__Type__c,
        //     'Default Type should be Percentage'
        // );

        Assert.areEqual(
            'All',
            savedRule.QuoteForce__Applies_To__c,
            'Default Applies_To should be All'
        );

        Assert.areEqual(
            true,
            savedRule.QuoteForce__Active__c,
            'Default Active should be true'
        );
    }
}