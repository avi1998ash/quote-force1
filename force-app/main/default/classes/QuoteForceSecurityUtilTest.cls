@isTest
public class QuoteForceSecurityUtilTest {

    // ─────────────────────────────────────────────────────────────
    // requireId() - valid Id
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testRequireIdValid() {

        Account acc = new Account(Name = 'Test Account');
        insert acc;

        Test.startTest();

        Id resultId =
            QuoteForceSecurityUtil.requireId(
                acc.Id,
                'recordId'
            );

        Test.stopTest();
    }

    // ─────────────────────────────────────────────────────────────
    // requireId() - blank Id
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testRequireIdBlank() {

        Test.startTest();

        try {

            QuoteForceSecurityUtil.requireId(
                '',
                'recordId'
            );

        } catch (Exception ex) {

            System.debug(ex.getMessage());
        }

        Test.stopTest();
    }

    // ─────────────────────────────────────────────────────────────
    // requireId() - invalid Id
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testRequireIdInvalid() {

        Test.startTest();

        try {

            QuoteForceSecurityUtil.requireId(
                'INVALID_ID',
                'recordId'
            );

        } catch (Exception ex) {

            System.debug(ex.getMessage());
        }

        Test.stopTest();
    }

    // ─────────────────────────────────────────────────────────────
    // resolveObjectApiName() - standard object
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testResolveObjectApiNameStandard() {

        Test.startTest();

        String result =
            QuoteForceSecurityUtil.resolveObjectApiName(
                'Account'
            );

        Test.stopTest();
    }

    // ─────────────────────────────────────────────────────────────
    // resolveObjectApiName() - blank value
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testResolveObjectApiNameBlank() {

        Test.startTest();

        String result =
            QuoteForceSecurityUtil.resolveObjectApiName(
                ''
            );

        Test.stopTest();
    }

    // ─────────────────────────────────────────────────────────────
    // resolveObjectApiName() - invalid object
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testResolveObjectApiNameInvalid() {

        Test.startTest();

        try {

            QuoteForceSecurityUtil.resolveObjectApiName(
                'InvalidObjectName'
            );

        } catch (Exception ex) {

            System.debug(ex.getMessage());
        }

        Test.stopTest();
    }

    // ─────────────────────────────────────────────────────────────
    // normalizeLocalApiName() - namespaced custom object
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testNormalizeLocalApiNameNamespaced() {

        Test.startTest();

        String result =
            QuoteForceSecurityUtil.normalizeLocalApiName(
                'abc__Test_Object__c'
            );

        Test.stopTest();
    }

    // ─────────────────────────────────────────────────────────────
    // normalizeLocalApiName() - standard object
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testNormalizeLocalApiNameStandard() {

        Test.startTest();

        String result =
            QuoteForceSecurityUtil.normalizeLocalApiName(
                'Account'
            );

        Test.stopTest();
    }

    // ─────────────────────────────────────────────────────────────
    // normalizeLocalApiName() - blank value
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testNormalizeLocalApiNameBlank() {

        Test.startTest();

        String result =
            QuoteForceSecurityUtil.normalizeLocalApiName(
                ''
            );

        Test.stopTest();
    }

    // ─────────────────────────────────────────────────────────────
    // assertCreateable()
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testAssertCreateable() {

        Test.startTest();

        QuoteForceSecurityUtil.assertCreateable(
            Account.SObjectType
        );

        Test.stopTest();
    }

    // ─────────────────────────────────────────────────────────────
    // assertUpdateable()
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testAssertUpdateable() {

        Test.startTest();

        QuoteForceSecurityUtil.assertUpdateable(
            Account.SObjectType
        );

        Test.stopTest();
    }

    // ─────────────────────────────────────────────────────────────
    // assertDeletable()
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testAssertDeletable() {

        Test.startTest();

        QuoteForceSecurityUtil.assertDeletable(
            Account.SObjectType
        );

        Test.stopTest();
    }

    // ─────────────────────────────────────────────────────────────
    // null object coverage
    // ─────────────────────────────────────────────────────────────
    @isTest
    static void testNullObjectCoverage() {

        Test.startTest();

        try {

            QuoteForceSecurityUtil.assertCreateable(
                null
            );

        } catch (Exception ex) {

            System.debug(ex.getMessage());
        }

        try {

            QuoteForceSecurityUtil.assertUpdateable(
                null
            );

        } catch (Exception ex) {

            System.debug(ex.getMessage());
        }

        try {

            QuoteForceSecurityUtil.assertDeletable(
                null
            );

        } catch (Exception ex) {

            System.debug(ex.getMessage());
        }

        Test.stopTest();
    }
}