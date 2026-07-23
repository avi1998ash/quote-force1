/**
* @description       : 
* @author            : ChangeMeIn@UserSettingsUnder.SFDoc
* @group             : 
* @last modified on  : 10-02-2024
* @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public with sharing class MasterTemplateController {
    
    @AuraEnabled
    public static String uploadImagesAndUpdateRecord(Id recordId, String primaryImageId, String secondaryImageId, Map<String, Object> fieldValues) {
        try {
            if (primaryImageId != null) {
                linkFileToRecordSafe(primaryImageId, recordId);
            }
            if (secondaryImageId != null) {
                linkFileToRecordSafe(secondaryImageId, recordId);
            }
            
            QuoteForce__Master_Template__c recordToUpdate = [SELECT Id FROM QuoteForce__Master_Template__c WHERE Id = :recordId WITH USER_MODE LIMIT 200];
            for (String fieldName : fieldValues.keySet()) {
                recordToUpdate.put(fieldName, fieldValues.get(fieldName));
            }
            update as user recordToUpdate;
            return 'Success';
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    private static void linkFileToRecordSafe(String contentDocumentId, Id recordId) {
        List<ContentDocumentLink> existing = [
            SELECT Id FROM ContentDocumentLink
            WHERE ContentDocumentId = :contentDocumentId
            AND LinkedEntityId = :recordId WITH USER_MODE
            LIMIT 1
        ];
        if (existing.isEmpty()) {
            insert as user new ContentDocumentLink(
                ContentDocumentId = contentDocumentId,
                LinkedEntityId = recordId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            );
        }
    }
    // Link the ContentVersion (file) to the QuoteForce__Master_Template__c record via ContentDocumentLink
    public static void linkFileToRecord(String contentVersionId, Id recordId) {
        ContentDocumentLink link = new ContentDocumentLink();
        link.LinkedEntityId = recordId;
        link.ContentDocumentId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :contentVersionId WITH USER_MODE].ContentDocumentId;
        link.ShareType = 'V';
        link.Visibility = 'AllUsers';
        insert as user link;
    }
}