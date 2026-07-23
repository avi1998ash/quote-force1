public with sharing class QuoteForceTaxService {

    public class TaxComponent {
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public Decimal rate { get; set; }
        @AuraEnabled public Decimal amount { get; set; }
    }

    public class TaxCalculationRequest {
        @AuraEnabled public Decimal unitPrice { get; set; }
        @AuraEnabled public Decimal quantity { get; set; }
        @AuraEnabled public Id taxRuleId { get; set; }
        @AuraEnabled public String overrideType { get; set; }
        @AuraEnabled public Decimal overrideValue { get; set; }
        @AuraEnabled public Boolean taxEnabled { get; set; }
        @AuraEnabled public Boolean taxInclusive { get; set; }
        @AuraEnabled public Boolean isInterstate { get; set; }
        @AuraEnabled public Boolean taxExempt { get; set; }
        @AuraEnabled public String countryCode { get; set; }
        @AuraEnabled public String country { get; set; }
    }

    public class TaxCalculationResult {
        @AuraEnabled public Decimal subtotal { get; set; }
        @AuraEnabled public Decimal taxableAmount { get; set; }
        @AuraEnabled public Decimal taxAmount { get; set; }
        @AuraEnabled public Decimal lineTotal { get; set; }
        @AuraEnabled public List<TaxComponent> components { get; set; }
        @AuraEnabled public String breakdownJson { get; set; }
        @AuraEnabled public Boolean taxApplied { get; set; }
        @AuraEnabled public String taxLabel { get; set; }
    }

    @AuraEnabled(cacheable=false)
    public static TaxCalculationResult calculateLineTax(
        TaxCalculationRequest request
    ) {

        if (request == null) {
            request = new TaxCalculationRequest();
        }

        Decimal subtotal =
            normalize(request.unitPrice) *
            normalize(request.quantity);

        TaxCalculationResult result = zeroResult(subtotal);

        if (
            request.taxEnabled != true ||
            request.taxExempt == true ||
            request.overrideType == 'No Tax'
        ) {
            return result;
        }

        String taxType;
        Decimal taxValue;
        Boolean ruleTaxInclusive = false;
        String taxLabel = 'Tax';

        QuoteForce__Tax_Rule__c rule;

        if (request.taxRuleId != null) {

            List<QuoteForce__Tax_Rule__c> rules = [
                SELECT Id,
                    Name,
                    QuoteForce__Type__c,
                    QuoteForce__Value__c,
                    QuoteForce__Tax_Inclusive__c,
                    QuoteForce__Country_Code__c,
                    QuoteForce__Country__c,
                    QuoteForce__Active__c
                FROM QuoteForce__Tax_Rule__c
                WHERE Id = :request.taxRuleId
                WITH USER_MODE
                LIMIT 1
            ];

            if (!rules.isEmpty()) {
                rule = rules[0];
            }
        }

        if (rule == null || rule.QuoteForce__Active__c != true) {
            return result;
        }

        taxType = rule.QuoteForce__Type__c;

        taxValue = normalize(rule.QuoteForce__Value__c);

        ruleTaxInclusive =
            rule.QuoteForce__Tax_Inclusive__c == true;

        taxLabel =
            String.isBlank(rule.Name)
            ? 'Tax'
            : rule.Name;

        if (
            request.overrideType == 'Percentage' ||
            request.overrideType == 'Fixed Amount'
        ) {

            taxType = request.overrideType;

            taxValue = normalize(request.overrideValue);

            taxLabel = 'Tax Override';
        }

        if (taxValue <= 0) {
            return result;
        }

        Boolean isInclusive =
            request.taxInclusive == true ||
            ruleTaxInclusive;

        Decimal taxAmount = 0;

        Decimal taxableAmount = subtotal;

        if (taxType == 'Fixed Amount') {

            taxAmount = taxValue;

            if (isInclusive) {

                taxAmount =
                    taxAmount > subtotal
                    ? subtotal
                    : taxAmount;

                taxableAmount = subtotal - taxAmount;
            }

        } else {

            Decimal rate = taxValue / 100;

            if (isInclusive) {

                taxAmount =
                    subtotal -
                    (subtotal / (1 + rate));

                taxableAmount = subtotal - taxAmount;

            } else {

                taxAmount = subtotal * rate;
            }
        }

        taxAmount = roundCurrency(taxAmount);

        taxableAmount = roundCurrency(taxableAmount);

        result.subtotal = roundCurrency(subtotal);

        result.taxableAmount = taxableAmount;

        result.taxAmount = taxAmount;

        result.lineTotal =
            isInclusive
            ? roundCurrency(subtotal)
            : roundCurrency(subtotal + taxAmount);

        result.components = buildComponents(
            taxLabel,
            taxType,
            taxValue,
            taxAmount,
            request.isInterstate == true,
            isIndia(request, rule)
        );

        result.breakdownJson =
            JSON.serialize(result.components);

        result.taxApplied = taxAmount > 0;

        result.taxLabel = taxLabel;

        return result;
    }

    public static TaxCalculationResult calculateLineTax(
        Decimal unitPrice,
        Decimal quantity,
        Id taxRuleId,
        String overrideType,
        Decimal overrideValue,
        Boolean taxEnabled,
        Boolean taxInclusive,
        Boolean isInterstate,
        Boolean taxExempt
    ) {

        TaxCalculationRequest request =
            new TaxCalculationRequest();

        request.unitPrice = unitPrice;
        request.quantity = quantity;
        request.taxRuleId = taxRuleId;
        request.overrideType = overrideType;
        request.overrideValue = overrideValue;
        request.taxEnabled = taxEnabled;
        request.taxInclusive = taxInclusive;
        request.isInterstate = isInterstate;
        request.taxExempt = taxExempt;

        return calculateLineTax(request);
    }

    public static TaxCalculationResult zeroResult(
        Decimal subtotal
    ) {

        TaxCalculationResult result =
            new TaxCalculationResult();

        result.subtotal =
            roundCurrency(normalize(subtotal));

        result.taxableAmount = result.subtotal;

        result.taxAmount = 0;

        result.lineTotal = result.subtotal;

        result.components = new List<TaxComponent>();

        result.breakdownJson = '[]';

        result.taxApplied = false;

        result.taxLabel = 'Tax';

        return result;
    }

    private static List<TaxComponent> buildComponents(
        String label,
        String taxType,
        Decimal taxValue,
        Decimal taxAmount,
        Boolean isInterstate,
        Boolean indiaTax
    ) {

        List<TaxComponent> components =
            new List<TaxComponent>();

        if (taxAmount <= 0) {
            return components;
        }

        if (indiaTax && taxType == 'Percentage') {

            if (isInterstate) {

                components.add(
                    component(
                        'IGST',
                        taxValue,
                        taxAmount
                    )
                );

            } else {

                Decimal halfRate =
                    roundCurrency(taxValue / 2);

                Decimal cgst =
                    roundCurrency(taxAmount / 2);

                components.add(
                    component(
                        'CGST',
                        halfRate,
                        cgst
                    )
                );

                components.add(
                    component(
                        'SGST',
                        halfRate,
                        taxAmount - cgst
                    )
                );
            }

            return components;
        }

        components.add(
            component(
                label,
                taxType == 'Percentage'
                ? taxValue
                : null,
                taxAmount
            )
        );

        return components;
    }

    private static TaxComponent component(
        String name,
        Decimal rate,
        Decimal amount
    ) {

        TaxComponent item = new TaxComponent();

        item.name = name;

        item.rate = rate;

        item.amount = roundCurrency(amount);

        return item;
    }

    private static Boolean isIndia(
        TaxCalculationRequest request,
        QuoteForce__Tax_Rule__c rule
    ) {

        String countryCode =
            String.isNotBlank(request.countryCode)
            ? request.countryCode
            : rule.QuoteForce__Country_Code__c;

        String country =
            String.isNotBlank(request.country)
            ? request.country
            : rule.QuoteForce__Country__c;

        return equalsIgnoreCase(countryCode, 'IN') ||
            equalsIgnoreCase(country, 'India');
    }

    private static Boolean equalsIgnoreCase(
        String leftValue,
        String rightValue
    ) {

        return String.isNotBlank(leftValue) &&
            leftValue.trim().equalsIgnoreCase(rightValue);
    }

    private static Decimal normalize(Decimal value) {

        return value == null ? 0 : value;
    }

    private static Decimal roundCurrency(Decimal value) {

        return normalize(value).setScale(
            2,
            RoundingMode.HALF_UP
        );
    }
}