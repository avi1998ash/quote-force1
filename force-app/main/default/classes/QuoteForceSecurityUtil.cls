public with sharing class QuoteForceSecurityUtil {

    public static Id requireId(
        String rawId,
        String parameterName
    ) {

        if (String.isBlank(rawId)) {

            throw new AuraHandledException(
                parameterName + ' is required.'
            );
        }

        try {

            return (Id) rawId;

        } catch (Exception ex) {

            throw new AuraHandledException(
                'Invalid ' + parameterName + '.'
            );
        }
    }

    public static String resolveObjectApiName(
        String objectApiName
    ) {

        if (String.isBlank(objectApiName)) {
            return null;
        }

        Map<String, Schema.SObjectType> globalDescribe =
            Schema.getGlobalDescribe();

        if (globalDescribe.containsKey(objectApiName)) {
            return objectApiName;
        }

        String suffix = '__' + objectApiName;

        for (String describedName : globalDescribe.keySet()) {

            if (describedName.endsWith(suffix)) {
                return describedName;
            }
        }

        throw new AuraHandledException(
            'Invalid object API name.'
        );
    }

    public static String normalizeLocalApiName(
        String apiName
    ) {

        if (String.isBlank(apiName)) {
            return apiName;
        }

        Pattern namespacedCustomName =
            Pattern.compile(
                '^[A-Za-z][A-Za-z0-9]*__(.+__c)$'
            );

        Matcher matcher =
            namespacedCustomName.matcher(apiName);

        return matcher.matches()
            ? matcher.group(1)
            : apiName;
    }

    public static void assertCreateable(
        Schema.SObjectType objectType
    ) {

        if (
            objectType == null ||
            !objectType.getDescribe().isCreateable()
        ) {

            throw new AuraHandledException(
                'Insufficient access to create records.'
            );
        }
    }

    public static void assertUpdateable(
        Schema.SObjectType objectType
    ) {

        if (
            objectType == null ||
            !objectType.getDescribe().isUpdateable()
        ) {

            throw new AuraHandledException(
                'Insufficient access to update records.'
            );
        }
    }

    public static void assertDeletable(
        Schema.SObjectType objectType
    ) {

        if (
            objectType == null ||
            !objectType.getDescribe().isDeletable()
        ) {

            throw new AuraHandledException(
                'Insufficient access to delete records.'
            );
        }
    }
}