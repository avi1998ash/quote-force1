/**
 * Aggregates live QuoteForce data for the home-page dashboard (quoteForceDashboard LWC).
 * One cacheable call returns everything the dashboard needs so the UI stays snappy.
 */
public with sharing class DashboardController {

    private static final Set<String> WON_STATUSES  = new Set<String>{ 'Accepted', 'Approved' };
    private static final Set<String> LOST_STATUSES = new Set<String>{ 'Rejected', 'Denied' };
    // Order shown in the Overview status grid.
    private static final List<String> STATUS_ORDER = new List<String>{
        'Draft', 'Needs Review', 'In Review', 'Presented', 'Approved', 'Accepted', 'Rejected', 'Denied'
    };

    public class DashboardData {
        @AuraEnabled public Integer totalQuotes = 0;
        @AuraEnabled public Decimal pipelineValue = 0;
        @AuraEnabled public Decimal achievedValue = 0;
        @AuraEnabled public Decimal targetValue = 0;
        @AuraEnabled public Integer wonCount = 0;
        @AuraEnabled public Decimal wonValue = 0;
        @AuraEnabled public Integer lostCount = 0;
        @AuraEnabled public Decimal lostValue = 0;
        @AuraEnabled public Integer inProgressCount = 0;
        @AuraEnabled public Decimal inProgressValue = 0;
        @AuraEnabled public Integer productCount = 0;
        @AuraEnabled public Integer bundleCount = 0;
        @AuraEnabled public Integer invoiceCount = 0;
        @AuraEnabled public Integer avgQuoteAgeDays = 0;
        @AuraEnabled public String currencyCode = 'USD';
        @AuraEnabled public List<StatusStat> statusStats = new List<StatusStat>();
        @AuraEnabled public List<QuoteRow> highValueQuotes = new List<QuoteRow>();
        @AuraEnabled public List<MonthStat> monthly = new List<MonthStat>();
    }

    public class StatusStat {
        @AuraEnabled public String label;
        @AuraEnabled public Integer count = 0;
        @AuraEnabled public Decimal value = 0;
    }

    public class QuoteRow {
        @AuraEnabled public Id id;
        @AuraEnabled public String name;
        @AuraEnabled public String customer;
        @AuraEnabled public String status;
        @AuraEnabled public Decimal value = 0;
        @AuraEnabled public Integer ageDays = 0;
    }

    public class MonthStat {
        @AuraEnabled public String label;
        @AuraEnabled public Integer won = 0;
        @AuraEnabled public Integer lost = 0;
    }

    @AuraEnabled(cacheable=true)
    public static DashboardData getDashboardData() {
        DashboardData d = new DashboardData();

        List<QuoteForce__Quotes__c> quotes = [
            SELECT Id, Name, QuoteForce__Status__c, QuoteForce__Currency__c,
                   QuoteForce__First_Name__c, QuoteForce__Last_Name__c, CreatedDate
            FROM QuoteForce__Quotes__c
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT 2000
        ];

        // Sum each quote's line-item value (Quantity * Price) — there is no rollup field on the quote.
        Map<Id, Decimal> valueByQuote = new Map<Id, Decimal>();
        for (QuoteForce__QuoteLineItem__c li : [
            SELECT QuoteForce__Quotes__c, QuoteForce__Quantity__c, QuoteForce__Price__c
            FROM QuoteForce__QuoteLineItem__c
            WHERE QuoteForce__Quotes__c != null
            WITH USER_MODE
            LIMIT 50000
        ]) {
            Decimal qty = li.QuoteForce__Quantity__c == null ? 0 : li.QuoteForce__Quantity__c;
            Decimal price = li.QuoteForce__Price__c == null ? 0 : li.QuoteForce__Price__c;
            Decimal running = valueByQuote.containsKey(li.QuoteForce__Quotes__c)
                ? valueByQuote.get(li.QuoteForce__Quotes__c) : 0;
            valueByQuote.put(li.QuoteForce__Quotes__c, running + (qty * price));
        }

        Map<String, StatusStat> statusMap = new Map<String, StatusStat>();
        Map<String, MonthStat> monthMap = new Map<String, MonthStat>();
        Map<String, Integer> currencyVotes = new Map<String, Integer>();
        List<QuoteRow> allRows = new List<QuoteRow>();
        Long totalAgeDays = 0;
        Date today = Date.today();

        for (QuoteForce__Quotes__c q : quotes) {
            String status = String.isBlank(q.QuoteForce__Status__c) ? 'Draft' : q.QuoteForce__Status__c;
            Decimal value = valueByQuote.containsKey(q.Id) ? valueByQuote.get(q.Id) : 0;

            // Status breakdown
            if (!statusMap.containsKey(status)) {
                StatusStat s = new StatusStat();
                s.label = status;
                statusMap.put(status, s);
            }
            StatusStat ss = statusMap.get(status);
            ss.count += 1;
            ss.value += value;

            // Won / Lost / In progress
            if (WON_STATUSES.contains(status)) {
                d.wonCount += 1; d.wonValue += value;
            } else if (LOST_STATUSES.contains(status)) {
                d.lostCount += 1; d.lostValue += value;
            } else {
                d.inProgressCount += 1; d.inProgressValue += value;
                d.pipelineValue += value;
            }

            // Currency vote
            String cur = String.isBlank(q.QuoteForce__Currency__c) ? 'USD' : q.QuoteForce__Currency__c;
            currencyVotes.put(cur, (currencyVotes.containsKey(cur) ? currencyVotes.get(cur) : 0) + 1);

            // Age
            Integer age = q.CreatedDate == null ? 0 : q.CreatedDate.date().daysBetween(today);
            totalAgeDays += age;

            // Monthly trend bucket
            if (q.CreatedDate != null) {
                String key = q.CreatedDate.year() + '-' + leftPad(q.CreatedDate.month());
                if (!monthMap.containsKey(key)) {
                    MonthStat ms = new MonthStat();
                    ms.label = monthShort(q.CreatedDate.month());
                    monthMap.put(key, ms);
                }
                if (WON_STATUSES.contains(status)) monthMap.get(key).won += 1;
                else if (LOST_STATUSES.contains(status)) monthMap.get(key).lost += 1;
            }

            // Row for the high-value table
            QuoteRow row = new QuoteRow();
            row.id = q.Id;
            row.name = q.Name;
            String customer = ((q.QuoteForce__First_Name__c == null ? '' : q.QuoteForce__First_Name__c) + ' ' +
                               (q.QuoteForce__Last_Name__c == null ? '' : q.QuoteForce__Last_Name__c)).trim();
            row.customer = String.isBlank(customer) ? q.Name : customer;
            row.status = status;
            row.value = value;
            row.ageDays = age;
            allRows.add(row);
        }

        d.totalQuotes = quotes.size();
        d.achievedValue = d.wonValue;
        d.avgQuoteAgeDays = quotes.isEmpty() ? 0 : (Integer) (totalAgeDays / quotes.size());
        d.currencyCode = topKey(currencyVotes, 'USD');
        d.targetValue = computeTarget(d.pipelineValue + d.achievedValue);

        // Ordered status stats
        for (String label : STATUS_ORDER) {
            if (statusMap.containsKey(label)) d.statusStats.add(statusMap.get(label));
        }
        for (String label : statusMap.keySet()) {
            if (!STATUS_ORDER.contains(label)) d.statusStats.add(statusMap.get(label));
        }

        // Top 5 high-value quotes
        allRows.sort(new RowValueComparator());
        for (Integer i = 0; i < allRows.size() && i < 5; i++) d.highValueQuotes.add(allRows[i]);

        // Last 8 months in chronological order
        d.monthly = lastMonths(monthMap, 8);

        d.productCount = countSafe('QuoteForce__Product__c');
        d.bundleCount  = countSafe('QuoteForce__Product_Bundle__c');
        d.invoiceCount = countSafe('QuoteForce__Invoice__c');

        return d;
    }

    private static List<MonthStat> lastMonths(Map<String, MonthStat> monthMap, Integer n) {
        List<MonthStat> result = new List<MonthStat>();
        Date cursor = Date.today().toStartOfMonth();
        List<String> keys = new List<String>();
        for (Integer i = n - 1; i >= 0; i--) {
            Date m = cursor.addMonths(-i);
            keys.add(m.year() + '-' + leftPad(m.month()));
            MonthStat ms = monthMap.get(m.year() + '-' + leftPad(m.month()));
            if (ms == null) { ms = new MonthStat(); ms.label = monthShort(m.month()); }
            result.add(ms);
        }
        return result;
    }

    private static Decimal computeTarget(Decimal basis) {
        if (basis == null || basis <= 0) return 1000000;
        Decimal goal = basis * 1.2;
        Decimal step = 50000;
        return (Decimal) (Math.ceil(goal / step) * step);
    }

    private static Integer countSafe(String objectName) {
        try {
            return Database.countQuery('SELECT COUNT() FROM ' + String.escapeSingleQuotes(objectName));
        } catch (Exception e) {
            return 0;
        }
    }

    private static String topKey(Map<String, Integer> votes, String fallback) {
        String best = fallback; Integer bestCount = -1;
        for (String k : votes.keySet()) {
            if (votes.get(k) > bestCount) { bestCount = votes.get(k); best = k; }
        }
        return best;
    }

    private static String leftPad(Integer month) {
        return month < 10 ? '0' + month : String.valueOf(month);
    }

    private static String monthShort(Integer month) {
        List<String> names = new List<String>{
            'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
        };
        return (month >= 1 && month <= 12) ? names[month - 1] : '';
    }

    private class RowValueComparator implements Comparator<QuoteRow> {
        public Integer compare(QuoteRow a, QuoteRow b) {
            if (a.value == b.value) return 0;
            return a.value < b.value ? 1 : -1; // descending
        }
    }
}