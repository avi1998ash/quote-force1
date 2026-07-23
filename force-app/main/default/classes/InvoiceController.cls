public with sharing class InvoiceController {
    public QuoteForce__Invoice__c invoiceRecord { get; private set; }
    public QuoteForce__Admin_Configuration__c adminConfig { get; private set; }
    public String logoUrl { get; private set; }
    public String signatureUrl { get; private set; }

    public List<Wrapper> lineItems { get; private set; }

    public Decimal subTotal   { get; private set; }
    public Decimal tax        { get; private set; }
    public Decimal grandTotal { get; private set; }

    // FIX 1: Currency code read from linked Quote
    private String quoteCurrencyCode = '';

    public class Wrapper {
        public String  name        { get; set; }
        public String  description { get; set; }
        public Decimal qty         { get; set; }
        public Decimal price       { get; set; }
        public Decimal total       { get; set; }
    }

    public InvoiceController(ApexPages.StandardController controller) {

        // FIX 4: Use controller.getId() — hardcoded ID removed
   Id invoiceId = controller.getId();
           //  Id invoiceId = 'a0CdL00001WTGgCUAX';

       

        lineItems  = new List<Wrapper>();
        subTotal   = 0;
        tax        = 0;
        grandTotal = 0;

        if (invoiceId == null) {
            return;
        }

        invoiceRecord = [
            SELECT Id,
                   Name,
                   QuoteForce__Date__c,
                   QuoteForce__Invoice_Number__c,
                   QuoteForce__Expiration_Date__c,
                   QuoteForce__Status__c,
                   QuoteForce__Tax__c,
                   QuoteForce__Quotes_Name__c,
                   QuoteForce__Quotes__c,     
                   QuoteForce__Layout_Name__c,
                   QuoteForce__Bill_To__Street__s,
                   QuoteForce__Ship_To__Street__s,
                   QuoteForce__Bill_To__City__s,
                   QuoteForce__Ship_To__City__s,
                   QuoteForce__Bill_To__StateCode__s,
                   QuoteForce__Ship_To__StateCode__s,
                   QuoteForce__Ship_To__PostalCode__s,
                   QuoteForce__Bill_To__PostalCode__s,
                   QuoteForce__Bill_To__CountryCode__s,
                   QuoteForce__Ship_To__CountryCode__s,
                   QuoteForce__Terms_Conditions__c,
                   QuoteForce__Letter_from_the_owner__c
            FROM QuoteForce__Invoice__c
            WHERE Id = :invoiceId WITH USER_MODE
            LIMIT 1
        ];

        // FIX 1: Read currency from linked Quote
        if (invoiceRecord.QuoteForce__Quotes__c != null) {
            List<QuoteForce__Quotes__c> linkedQuotes = [
                SELECT QuoteForce__Currency__c
                FROM QuoteForce__Quotes__c
                WHERE Id = :invoiceRecord.QuoteForce__Quotes__c
                WITH USER_MODE
                LIMIT 1
            ];
            if (!linkedQuotes.isEmpty() &&
                String.isNotBlank(linkedQuotes[0].QuoteForce__Currency__c)) {
                quoteCurrencyCode = linkedQuotes[0].QuoteForce__Currency__c;
            }
        }

        adminConfig = AdminSettingController.getAdminConfig();

        logoUrl = buildFileUrl(
            adminConfig != null ? adminConfig.QuoteForce__Company_Logo_URL__c : null
        );

        signatureUrl = buildFileUrl(
            adminConfig != null ? adminConfig.QuoteForce__Signature_URL__c : null
        );
        System.debug('System invoice is'+ invoiceId);
        /* Line Items + Subtotal */
        List<QuoteForce__Invoice_line_items__c> invoiceItems = [
            SELECT Id,
                QuoteForce__Quantity__c,
                QuoteForce__Price__c,
                QuoteForce__ProductCode__c,
                QuoteForce__Product_Custom__r.Name,
                QuoteForce__Product_Custom__r.QuoteForce__Description__c
            FROM QuoteForce__Invoice_line_items__c
            WHERE QuoteForce__Invoice__c = :invoiceId
            WITH USER_MODE
            ORDER BY CreatedDate ASC
        ];
        //  System.debug('Total Invoice Items: ' + invoiceItems.size());

        for (QuoteForce__Invoice_line_items__c item : invoiceItems) {
            Wrapper w = new Wrapper();
            

            w.name =
                item.QuoteForce__Product_Custom__r != null &&
                String.isNotBlank(item.QuoteForce__Product_Custom__r.Name)
                ? item.QuoteForce__Product_Custom__r.Name
                : 'Line Item';

            w.description =
                item.QuoteForce__Product_Custom__r != null &&
                String.isNotBlank(item.QuoteForce__Product_Custom__r.QuoteForce__Description__c)
                ? item.QuoteForce__Product_Custom__r.QuoteForce__Description__c
                : 'No description available.';

            w.qty   = item.QuoteForce__Quantity__c != null ? item.QuoteForce__Quantity__c : 0;
            w.price = item.QuoteForce__Price__c    != null ? item.QuoteForce__Price__c    : 0;
            w.total = w.qty * w.price;
            // System.debug('Qty      : ' + w.qty);
            // System.debug('Price    : ' + w.price);
            // System.debug('LineTotal: ' + w.total);
            subTotal += w.total;
            lineItems.add(w);
        }
        // System.debug('Final SubTotal : ' + subTotal);
        // // System.debug('Tax Percent    : ' + taxPercent);
        // System.debug('Tax            : ' + tax);
        // System.debug('Grand Total    : ' + grandTotal);
        // System.debug('Wrapper Count  : ' + lineItems.size());
        /* TAX CALCULATION */
        Decimal taxPercent = 0;
        String taxFromUrl  = ApexPages.currentPage().getParameters().get('tax');

        if (String.isNotBlank(taxFromUrl)) {
            try {
                taxPercent = Decimal.valueOf(taxFromUrl);
            } catch (Exception e) {
                taxPercent = invoiceRecord.QuoteForce__Tax__c != null
                    ? invoiceRecord.QuoteForce__Tax__c
                    : 0;
            }
        } else {
            taxPercent = invoiceRecord.QuoteForce__Tax__c != null
                ? invoiceRecord.QuoteForce__Tax__c
                : 0;
        }

        tax        = (subTotal * taxPercent) / 100;
        grandTotal = subTotal + tax;
    }

    // FIX 1: getCurrencySymbol — reads from linked Quote, returns currency code
    public String getCurrencySymbol() {
        // Optional URL override for flexibility
        String fromUrl = ApexPages.currentPage().getParameters().get('currency');
        if (String.isNotBlank(fromUrl)) {
            return fromUrl + ' ';
        }
        return String.isNotBlank(quoteCurrencyCode)
            ? quoteCurrencyCode + ' '
            : 'USD ';
    }

    public String getCompanyName() {
        if (adminConfig != null && String.isNotBlank(adminConfig.Name)) {
            return adminConfig.Name;
        }
        Organization org = [SELECT Id, Name FROM Organization WITH USER_MODE LIMIT 1];
        return org.Name;
    }

    public String getCompanyAddress() {
        if (adminConfig == null) {
            return '';
        }
        return toHtmlLines(new List<String>{
            adminConfig.QuoteForce__Street__c,
            formatCityLine(
                adminConfig.QuoteForce__City__c,
                adminConfig.QuoteForce__State_Province__c,
                adminConfig.QuoteForce__Postal_Code__c
            ),
            adminConfig.QuoteForce__Country__c
        });
    }

    public String getInvoiceDateLabel() {
        return invoiceRecord != null && invoiceRecord.QuoteForce__Date__c != null
            ? formatDateValue(invoiceRecord.QuoteForce__Date__c)
            : '';
    }

    public String getBilledToDetails() {
        if (invoiceRecord == null) return '';
        return toHtmlLines(new List<String>{
            invoiceRecord.QuoteForce__Bill_To__Street__s,
            formatCityLine(
                invoiceRecord.QuoteForce__Bill_To__City__s,
                invoiceRecord.QuoteForce__Bill_To__StateCode__s,
                invoiceRecord.QuoteForce__Bill_To__PostalCode__s
            ),
            invoiceRecord.QuoteForce__Bill_To__CountryCode__s
        });
    }

    public String getShippingDetails() {
        if (invoiceRecord == null) return '';
        return toHtmlLines(new List<String>{
            invoiceRecord.QuoteForce__Ship_To__Street__s,
            formatCityLine(
                invoiceRecord.QuoteForce__Ship_To__City__s,
                invoiceRecord.QuoteForce__Ship_To__StateCode__s,
                invoiceRecord.QuoteForce__Ship_To__PostalCode__s
            ),
            invoiceRecord.QuoteForce__Ship_To__CountryCode__s
        });
    }

    public String getServiceTitle() {
        return String.isNotBlank(invoiceRecord.QuoteForce__Layout_Name__c)
            ? invoiceRecord.QuoteForce__Layout_Name__c
            : 'Invoice Details';
    }

    public String getReferenceNumber() {
        return String.isNotBlank(invoiceRecord.QuoteForce__Quotes_Name__c)
            ? invoiceRecord.QuoteForce__Quotes_Name__c
            : invoiceRecord.Id;
    }

    public String getDueDateLabel() {
        return invoiceRecord != null && invoiceRecord.QuoteForce__Expiration_Date__c != null
            ? formatDateValue(invoiceRecord.QuoteForce__Expiration_Date__c)
            : '';
    }

    public String getNotesText() {
        return adminConfig != null && String.isNotBlank(adminConfig.QuoteForce__Notes__c)
            ? adminConfig.QuoteForce__Notes__c
            : String.isNotBlank(invoiceRecord.QuoteForce__Letter_from_the_owner__c)
                ? invoiceRecord.QuoteForce__Letter_from_the_owner__c
                : 'No notes available.';
    }

    public String getTermsText() {
        return adminConfig != null && String.isNotBlank(adminConfig.QuoteForce__Invoice_Terms_Condition__c)
            ? adminConfig.QuoteForce__Invoice_Terms_Condition__c
            : String.isNotBlank(invoiceRecord.QuoteForce__Terms_Conditions__c)
                ? invoiceRecord.QuoteForce__Terms_Conditions__c
                : 'No terms and conditions available.';
    }

    public String getEmailText() {
        return adminConfig != null && String.isNotBlank(adminConfig.QuoteForce__Email__c)
            ? adminConfig.QuoteForce__Email__c
            : '';
    }

    public String getPhoneText() {
        return adminConfig != null && String.isNotBlank(adminConfig.QuoteForce__Phone__c)
            ? adminConfig.QuoteForce__Phone__c
            : '';
    }

    public String getWebsiteText() {
        return adminConfig != null && String.isNotBlank(adminConfig.Name)
            ? adminConfig.Name
            : '';
    }

    // FOOTER FIX: Estimates remaining blank space on the page so the footer
    // can be pushed down to the bottom on short invoices. On longer invoices
    // (where content already fills/exceeds the page), this returns 0 and the
    // footer simply flows naturally after the content on the last page.
    public Decimal getSpacerHeight() {
        // Approx. usable page height in points (A4 ≈ 841.89pt; small safety buffer)
        Decimal pageHeightPt = 800;

        // Approx. combined height (pt) of all fixed, non-repeating sections:
        // header + blue bar + meta bar + address cards + totals +
        // notes/terms + signature + footer itself
        Decimal fixedSectionsHeightPt = 430;

        // Approx. height (pt) of one line-item row (padding + font line-height)
        Decimal rowHeightPt = 27;

        Integer rowCount = lineItems != null ? lineItems.size() : 0;

        Decimal estimatedContentHeight =
            fixedSectionsHeightPt + (rowCount * rowHeightPt);

        Decimal remaining = pageHeightPt - estimatedContentHeight;

        return remaining > 0 ? remaining : 0;
    }

    public Decimal getEffectiveTax() {
        String taxFromUrl = ApexPages.currentPage().getParameters().get('tax');
        if (String.isNotBlank(taxFromUrl)) {
            try {
                return Decimal.valueOf(taxFromUrl);
            } catch (Exception e) {}
        }
        return invoiceRecord.QuoteForce__Tax__c != null
            ? invoiceRecord.QuoteForce__Tax__c
            : 0;
    }

    // ── PRIVATE HELPERS ──────────────────────────────────────────────────────

    private static String buildFileUrl(String rawInput) {
        if (String.isBlank(rawInput)) return null;
        String rawValue = rawInput.trim();

        if (rawValue.startsWith('http://') || rawValue.startsWith('https://')) {
            return rawValue;
        }
        if (rawValue.startsWith('/sfc/')) {
            return URL.getOrgDomainUrl().toExternalForm() + rawValue;
        }
        return URL.getOrgDomainUrl().toExternalForm() +
            '/sfc/servlet.shepherd/version/download/' + rawValue;
    }

    private static String formatCityLine(String city, String state, String postalCode) {
        List<String> parts = new List<String>();
        if (String.isNotBlank(city))  parts.add(city);
        if (String.isNotBlank(state)) parts.add(state);
        String output = String.join(parts, ', ');
        if (String.isNotBlank(postalCode)) {
            output = String.isNotBlank(output) ? output + ' ' + postalCode : postalCode;
        }
        return output;
    }

    private static String formatCityLine(String city, String state, Decimal postalCode) {
        return formatCityLine(
            city, state,
            postalCode != null ? String.valueOf(postalCode) : null
        );
    }

    private static String formatDateValue(Date inputDate) {
        if (inputDate == null) return '';
        List<String> months = new List<String>{
            'January','February','March','April','May','June',
            'July','August','September','October','November','December'
        };
        return String.valueOf(inputDate.day()) + ' ' +
               months[inputDate.month() - 1]  + ' ' +
               String.valueOf(inputDate.year());
    }

    private static String toHtmlLines(List<String> lines) {
        List<String> filtered = new List<String>();
        for (String line : lines) {
            if (String.isNotBlank(line)) filtered.add(line);
        }
        return String.join(filtered, '<br/>');
    }
}