@IsTest
private class QuoteForceTaxServiceTest {

    private static QuoteForce__Tax_Rule__c makeRule(
        String name,
        String typeValue,
        Decimal value,
        Boolean inclusive,
        String countryCode
    ) {

        QuoteForce__Tax_Rule__c rule =
            new QuoteForce__Tax_Rule__c(
                Name = name,
                QuoteForce__Type__c = typeValue,
                QuoteForce__Value__c = value,
                QuoteForce__Tax_Inclusive__c = inclusive,
                QuoteForce__Country_Code__c = countryCode,
                QuoteForce__Country__c =
                    countryCode == 'IN'
                    ? 'India'
                    : 'United States',
                QuoteForce__Applies_To__c = 'All',
                QuoteForce__Active__c = true
            );

        insert rule;

        return rule;
    }

    @IsTest
    static void taxDisabledAndMissingRuleReturnZero() {

        QuoteForceTaxService.TaxCalculationResult disabledResult =
            QuoteForceTaxService.calculateLineTax(
                100,
                2,
                null,
                null,
                null,
                false,
                false,
                false,
                false
            );

        System.assertEquals(
            200,
            disabledResult.subtotal
        );

        System.assertEquals(
            0,
            disabledResult.taxAmount
        );

        System.assertEquals(
            200,
            disabledResult.lineTotal
        );

        QuoteForceTaxService.TaxCalculationResult missingRuleResult =
            QuoteForceTaxService.calculateLineTax(
                100,
                2,
                null,
                null,
                null,
                true,
                false,
                false,
                false
            );

        System.assertEquals(
            0,
            missingRuleResult.taxAmount
        );
    }

    @IsTest
    static void calculatesPercentageFixedInclusiveAndOverrides() {

        QuoteForce__Tax_Rule__c percentageRule =
            makeRule(
                'GST 18',
                'Percentage',
                18,
                false,
                'IN'
            );

        QuoteForce__Tax_Rule__c fixedRule =
            makeRule(
                'Fixed 500',
                'Fixed Amount',
                500,
                false,
                'US'
            );

        QuoteForce__Tax_Rule__c inclusiveRule =
            makeRule(
                'Inclusive 18',
                'Percentage',
                18,
                true,
                'IN'
            );

        QuoteForceTaxService.TaxCalculationResult percentageResult =
            QuoteForceTaxService.calculateLineTax(
                1000,
                1,
                percentageRule.Id,
                null,
                null,
                true,
                false,
                false,
                false
            );

        System.assertEquals(
            180,
            percentageResult.taxAmount
        );

        System.assertEquals(
            1180,
            percentageResult.lineTotal
        );

        System.assertEquals(
            2,
            percentageResult.components.size(),
            'Intrastate India GST splits into CGST and SGST.'
        );

        QuoteForceTaxService.TaxCalculationResult interstateResult =
            QuoteForceTaxService.calculateLineTax(
                1000,
                1,
                percentageRule.Id,
                null,
                null,
                true,
                false,
                true,
                false
            );

        System.assertEquals(
            'IGST',
            interstateResult.components[0].name
        );

        QuoteForceTaxService.TaxCalculationResult fixedResult =
            QuoteForceTaxService.calculateLineTax(
                1000,
                1,
                fixedRule.Id,
                null,
                null,
                true,
                false,
                false,
                false
            );

        System.assertEquals(
            500,
            fixedResult.taxAmount
        );

        QuoteForceTaxService.TaxCalculationResult inclusiveResult =
            QuoteForceTaxService.calculateLineTax(
                1180,
                1,
                inclusiveRule.Id,
                null,
                null,
                true,
                true,
                true,
                false
            );

        System.assertEquals(
            180,
            inclusiveResult.taxAmount
        );

        System.assertEquals(
            1180,
            inclusiveResult.lineTotal
        );

        QuoteForceTaxService.TaxCalculationResult overrideResult =
            QuoteForceTaxService.calculateLineTax(
                1000,
                1,
                percentageRule.Id,
                'Fixed Amount',
                25,
                true,
                false,
                false,
                false
            );

        System.assertEquals(
            25,
            overrideResult.taxAmount
        );

        QuoteForceTaxService.TaxCalculationResult noTaxResult =
            QuoteForceTaxService.calculateLineTax(
                1000,
                1,
                percentageRule.Id,
                'No Tax',
                null,
                true,
                false,
                false,
                false
            );

        System.assertEquals(
            0,
            noTaxResult.taxAmount
        );

        QuoteForceTaxService.TaxCalculationResult exemptResult =
            QuoteForceTaxService.calculateLineTax(
                1000,
                1,
                percentageRule.Id,
                null,
                null,
                true,
                false,
                false,
                true
            );

        System.assertEquals(
            0,
            exemptResult.taxAmount
        );
    }
}