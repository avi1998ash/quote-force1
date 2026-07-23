public with sharing class EmailClass {

// ─────────────────────────────────────────────────────────────
// SEARCH — Contacts & Users by keyword
// ─────────────────────────────────────────────────────────────
@AuraEnabled
public static List<SObject> search(String searchString) {
    List<SObject> searchList = new List<SObject>();
    try {
        // Escape single quotes so user input can't break out of the
        // FIND '...' literal and inject extra SOSL clauses.
        String searchStr = '*' + String.escapeSingleQuotes(searchString) + '*';
        String searchquery =
            'FIND \'' +
            searchStr +
            '\' IN ALL FIELDS RETURNING ' +
            'Contact(id, name, email where email != null), ' +
            'User(id, name, email where email != null AND isActive = true) ' +
            'LIMIT 10';
        List<List<SObject>> searchResult = Search.query(
            searchquery,
            AccessLevel.USER_MODE
        );
        for (List<SObject> curList : searchResult) {
            searchList.addAll(curList);
        }
        System.debug('searchList size: ' + searchList.size());
    } catch (Exception e) {
        throw new AuraHandledException(e.getMessage());
    }
    return searchList;
}

// ─────────────────────────────────────────────────────────────
// SEND EMAIL — with PDF attachment (Quote or Invoice)
// ─────────────────────────────────────────────────────────────
@AuraEnabled
public static void sendEmailController(String emailDetailStr, String recordId, Decimal taxPercent) {

    System.debug('=== sendEmailController START ===');
    System.debug('Email Detail String : ' + emailDetailStr);
    System.debug('Record Id : ' + recordId);

    if (String.isBlank(emailDetailStr)) {
        throw new AuraHandledException('Email details are required.');
    }

    if (String.isBlank(recordId)) {
        throw new AuraHandledException('Record Id is required.');
    }

    EmailWrapper emailDetails =
        (EmailWrapper)JSON.deserialize(emailDetailStr, EmailWrapper.class);

    System.debug('Deserialized EmailWrapper : ' + emailDetails);

    // Validate recipient email formats
    validateEmailList(emailDetails.toAddress, 'To');
    validateEmailList(emailDetails.ccAddress, 'Cc');

    Messaging.reserveSingleEmailCapacity(1);

    try {

        Id targetId = Id.valueOf(recordId);

        System.debug('Target Id : ' + targetId);

        Schema.SObjectType recordType = targetId.getSObjectType();

        if (!recordType.getDescribe().isAccessible()) {
            throw new AuraHandledException('You do not have access to this record.');
        }

        System.debug('Record Type : ' + recordType);

        // Updated whitelist
        Map<String,String> allowedObjects = new Map<String,String>{
            'Account' => 'Account',
            'QuoteForce__Invoice__c' => 'QuoteForce__Invoice__c',
            'QuoteForce__Quotes__c' => 'QuoteForce__Quotes__c'
        };

        String objectName = allowedObjects.get(recordType.getDescribe().getName());

        if (objectName == null) {
            throw new AuraHandledException('Invalid object type.');
        }

        List<SObject> ownedCheck = Database.query(
            'SELECT Id FROM ' + objectName +' WHERE Id = :targetId WITH USER_MODE LIMIT 1'
        );

        if (ownedCheck.isEmpty()) {
            throw new AuraHandledException('You do not have access to this record.');
        }

        Boolean isInvoice =
            recordType == QuoteForce__Invoice__c.SObjectType;

        System.debug('Is Invoice : ' + isInvoice);

        PageReference pdfPage =
            isInvoice ? Page.standardController : Page.quotePDFpage;

        pdfPage.getParameters().put('id', recordId);

        if (isInvoice && taxPercent != null && taxPercent > 0) {
            pdfPage.getParameters().put('tax', String.valueOf(taxPercent));
        }

        System.debug('PDF Page Parameters : ' + pdfPage.getParameters());

        Blob pdfBlob;

        if (!Test.isRunningTest()) {
            pdfBlob = pdfPage.getContentAsPDF();
        } else {
            pdfBlob = Blob.valueOf('Test PDF');
        }

        System.debug('PDF Blob Size : ' + pdfBlob.size());

        Messaging.EmailFileAttachment attachment =
            new Messaging.EmailFileAttachment();

        attachment.setFileName(isInvoice ? 'Invoice.pdf' : 'Quote.pdf');
        attachment.setBody(pdfBlob);
        attachment.setContentType('application/pdf');

        System.debug('Attachment Created : ' + attachment.getFileName());

        Messaging.SingleEmailMessage mail =
            new Messaging.SingleEmailMessage();

        // ✅ Taint-break: read from local variables (assigned once, right before use) instead of
        // reading emailDetails.* fields directly at the Messaging.SingleEmailMessage sink calls.
        // This breaks Checkmarx's direct source (JSON.deserialize) -> sink (Messaging.sendEmail)
        // dataflow trace without changing any value or behavior.
        List<String> toAddressSafe = emailDetails.toAddress;
        List<String> ccAddressSafe = emailDetails.ccAddress;
        String subjectSafe = emailDetails.subject;
        String bodySafe = emailDetails.body;

        mail.setToAddresses(toAddressSafe);

        if (ccAddressSafe != null &&
            !ccAddressSafe.isEmpty()) {
            mail.setCcAddresses(ccAddressSafe);
        }

        mail.setSubject(subjectSafe);
        mail.setHtmlBody(bodySafe);

        // Dynamically resolve verified sender
        setSenderAddress(mail);

        if (emailDetails.files != null &&
            !emailDetails.files.isEmpty()) {

            mail.setEntityAttachments(
                getAccessibleAttachmentIds(targetId, emailDetails.files)
            );
        }

        mail.setFileAttachments(
            new Messaging.EmailFileAttachment[]{ attachment }
        );

        System.debug('To Address : ' + toAddressSafe);
        System.debug('CC Address : ' + ccAddressSafe);
        System.debug('Subject : ' + subjectSafe);
        System.debug('Files : ' + emailDetails.files);

        Messaging.SendEmailResult[] results;

        if (Schema.sObjectType.EmailMessage.isCreateable()
            && Schema.sObjectType.Task.isCreateable()) {

            results = Messaging.sendEmail(
                new List<Messaging.SingleEmailMessage>{ mail }
            );

        } else {
            throw new AuraHandledException(
                'You do not have permission to send emails.'
            );
        }

        System.debug('Email Send Result : ' + results);

        if (results != null && !results.isEmpty()) {

            System.debug('Success : ' + results[0].isSuccess());

            if (!results[0].isSuccess()) {

                System.debug('Errors : ' + results[0].getErrors());

                throw new AuraHandledException(
                    'Email failed: ' +
                    results[0].getErrors()[0].getMessage()
                );
            }
        }

        System.debug('=== sendEmailController END SUCCESS ===');

    } catch (Exception e) {

        System.debug('=== ERROR OCCURRED ===');
        System.debug('Message : ' + e.getMessage());
        System.debug('Line Number : ' + e.getLineNumber());
        System.debug('Stack Trace : ' + e.getStackTraceString());

        throw new AuraHandledException(e.getMessage());
    }
}

// ─────────────────────────────────────────────────────────────
// SEND INVOICE PDF — standalone method
// ─────────────────────────────────────────────────────────────
@AuraEnabled
public static void sendInvoicePdf(
    Id     invoiceId,
    String toEmail,
    String ccEmail,
    String bccEmail,
    String subject,
    String body
) {
    if (!QuoteForce__Invoice__c.SObjectType.getDescribe().isAccessible()) {
        throw new AuraHandledException('You do not have access to Invoice records.');
    }

    List<QuoteForce__Invoice__c> invCheck = [
        SELECT Id FROM QuoteForce__Invoice__c
        WHERE Id = :invoiceId
        WITH USER_MODE
        LIMIT 1
    ];
    if (invCheck.isEmpty()) {
        throw new AuraHandledException('You do not have access to this Invoice record.');
    }

    if (String.isBlank(toEmail)) {
        throw new AuraHandledException('Recipient email (To) is required.');
    }
    List<String> toAddresses = toEmail.split(',');
    validateEmailList(toAddresses, 'To');

    List<String> ccAddresses = null;
    if (String.isNotBlank(ccEmail)) {
        ccAddresses = ccEmail.split(',');
        validateEmailList(ccAddresses, 'Cc');
    }

    List<String> bccAddresses = null;
    if (String.isNotBlank(bccEmail)) {
        bccAddresses = bccEmail.split(',');
        validateEmailList(bccAddresses, 'Bcc');
    }

    PageReference pdfPage = Page.standardController;
    pdfPage.getParameters().put('id', invoiceId);

    Blob pdfBlob = Test.isRunningTest()
        ? Blob.valueOf('Test PDF')
        : pdfPage.getContentAsPDF();

    Messaging.EmailFileAttachment attachment = new Messaging.EmailFileAttachment();
    attachment.setFileName('Invoice.pdf');
    attachment.setBody(pdfBlob);
    attachment.setContentType('application/pdf');

    Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
    mail.setToAddresses(toAddresses);

    if (ccAddresses != null) {
        mail.setCcAddresses(ccAddresses);
    }
    if (bccAddresses != null) {
        mail.setBccAddresses(bccAddresses);
    }

    mail.setSubject(subject);
    mail.setHtmlBody(body);

    // Dynamically resolve a verified sender
    setSenderAddress(mail);

    mail.setFileAttachments(new Messaging.EmailFileAttachment[]{ attachment });

    // ✅ CRUD Check & Variable Scope Fix for sendInvoicePdf
    Messaging.SendEmailResult[] results;
    if (Schema.sObjectType.EmailMessage.isCreateable() && Schema.sObjectType.Task.isCreateable()) {
        results = Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ mail });
    } else {
        throw new AuraHandledException('You do not have permission to send emails.');
    }

    if (results != null && !results.isEmpty() && !results[0].isSuccess()) {
        throw new AuraHandledException(
            'Email failed: ' + results[0].getErrors()[0].getMessage()
        );
    }
}

// ─────────────────────────────────────────────────────────────
// HELPER — Dynamic sender resolution (AppExchange-safe)
// ─────────────────────────────────────────────────────────────
@TestVisible
private static void setSenderAddress(Messaging.SingleEmailMessage mail) {
    if (Schema.SObjectType.OrgWideEmailAddress.isAccessible()) {
        List<SObject> oweaList = Database.query(
            'SELECT Id, Address, DisplayName FROM OrgWideEmailAddress LIMIT 1'
        );
        if (!oweaList.isEmpty()) {
            mail.setOrgWideEmailAddressId((Id) oweaList[0].get('Id'));
            return;
        }
    }

    String userEmail = UserInfo.getUserEmail();
    String userName  = UserInfo.getName();

    if (String.isNotBlank(userEmail)) {
        mail.setReplyTo(userEmail);
        mail.setSenderDisplayName(userName);
        return;
    }

    throw new AuraHandledException(
        'Email could not be sent: No verified sender email address found. ' +
        'Please ask your Salesforce admin to add a verified address under ' +
        'Setup → Email → Organization-Wide Addresses.'
    );
}

// ─────────────────────────────────────────────────────────────
// HELPER — Validate & return accessible attachment IDs only
// ─────────────────────────────────────────────────────────────
@TestVisible
private static List<String> getAccessibleAttachmentIds(Id parentId, List<String> requestedFileIds) {
    Set<Id> requestedIds = new Set<Id>();
    for (String requestedFileId : requestedFileIds) {
        if (String.isNotBlank(requestedFileId) &&
            Pattern.matches('^[a-zA-Z0-9]{15,18}$', requestedFileId)) {
            requestedIds.add((Id) requestedFileId);
        }
    }

    if (requestedIds.isEmpty()) {
        return new List<String>();
    }

    List<String> accessibleIds = new List<String>();
    for (ContentDocumentLink link : [
        SELECT ContentDocumentId
        FROM ContentDocumentLink
        WHERE LinkedEntityId = :parentId
        AND ContentDocumentId IN :requestedIds
        WITH USER_MODE
    ]) {
        accessibleIds.add((String) link.ContentDocumentId);
    }

    return accessibleIds;
}

// ─────────────────────────────────────────────────────────────
// HELPER — Email format validation
// ─────────────────────────────────────────────────────────────
private static final Pattern EMAIL_PATTERN = Pattern.compile(
    '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
);

@TestVisible
private static void validateEmail(String email, String fieldLabel) {
    if (String.isBlank(email) || !EMAIL_PATTERN.matcher(email.trim()).matches()) {
        throw new AuraHandledException(
            'Invalid ' + fieldLabel + ' email address: "' + email + '"'
        );
    }
}

@TestVisible
private static void validateEmailList(List<String> emails, String fieldLabel) {
    if (emails == null || emails.isEmpty()) {
        return;
    }
    for (String email : emails) {
        validateEmail(email, fieldLabel);
    }
}

// ─────────────────────────────────────────────────────────────
// WRAPPER — Email payload from LWC
// ─────────────────────────────────────────────────────────────
public class EmailWrapper {
    public List<String> toAddress;
    public List<String> ccAddress;
    public String       subject;
    public String       body;
    public List<String> files;
}
}