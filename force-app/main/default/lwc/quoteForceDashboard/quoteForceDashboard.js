import { LightningElement, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getDashboardData from '@salesforce/apex/DashboardController.getDashboardData';

const STATUS_CLASS = {
    'Draft': 'is-draft',
    'Needs Review': 'is-review',
    'In Review': 'is-review',
    'Presented': 'is-presented',
    'Approved': 'is-won',
    'Accepted': 'is-won',
    'Rejected': 'is-lost',
    'Denied': 'is-lost'
};

const NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: 'utility:dashboard' },
    { key: 'products', label: 'Products', icon: 'utility:catalog' },
    { key: 'templates', label: 'Templates', icon: 'utility:page' },
    { key: 'admin', label: 'Admin Config', icon: 'utility:settings' },
    { key: 'createQuote', label: 'Create Quote', icon: 'utility:add' }
];

const VIEW_TITLES = {
    dashboard: 'Sales Dashboard',
    products: 'Products & Bundles',
    templates: 'Quote Templates',
    admin: 'Admin Configuration',
    createQuote: 'Create Quote'
};

export default class QuoteForceDashboard extends LightningElement {
    data;
    error;
    loaded = false;
    _wired;
    activeView = 'dashboard';

    // ---------- navigation ----------
    get navItems() {
        return NAV.map((item) => {
            const active = this.activeView === item.key;
            return {
                ...item,
                cssClass: active ? 'nav-item is-active' : 'nav-item',
                variant: active ? 'inverse' : ''
            };
        });
    }

    handleNav(event) {
        this.activeView = event.currentTarget.dataset.key;
    }

    get viewTitle() {
        return VIEW_TITLES[this.activeView] || 'Dashboard';
    }

    get isDashboard() { return this.activeView === 'dashboard'; }
    get isProducts() { return this.activeView === 'products'; }
    get isTemplates() { return this.activeView === 'templates'; }
    get isAdmin() { return this.activeView === 'admin'; }
    get isCreateQuote() { return this.activeView === 'createQuote'; }

    @wire(getDashboardData)
    wiredData(result) {
        this._wired = result;
        this.loaded = true;
        if (result.data) {
            this.data = result.data;
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.data = undefined;
        }
    }

    handleRefresh() {
        this.loaded = false;
        refreshApex(this._wired).finally(() => {
            this.loaded = true;
        });
    }

    get d() {
        return this.data || {};
    }

    get hasData() {
        return !!this.data && this.d.totalQuotes > 0;
    }

    get isEmpty() {
        return this.loaded && (!this.data || this.d.totalQuotes === 0);
    }

    // ---------- formatting helpers ----------
    get currencyCode() {
        return this.d.currencyCode || 'USD';
    }

    money(value) {
        const v = Number(value) || 0;
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: this.currencyCode,
                maximumFractionDigits: 0
            }).format(v);
        } catch (e) {
            return `${v.toLocaleString()}`;
        }
    }

    num(value) {
        return (Number(value) || 0).toLocaleString();
    }

    // ---------- overview ----------
    get pipelineLabel() { return this.money(this.d.pipelineValue); }
    get achievedLabel() { return this.money(this.d.achievedValue); }
    get targetLabel() { return this.money(this.d.targetValue); }
    get differenceLabel() {
        return this.money((Number(this.d.targetValue) || 0) - (Number(this.d.achievedValue) || 0));
    }
    get totalQuotesLabel() { return this.num(this.d.totalQuotes); }
    get progressPercent() {
        const t = Number(this.d.targetValue) || 0;
        const a = Number(this.d.achievedValue) || 0;
        if (t <= 0) return 0;
        return Math.min(100, Math.round((a / t) * 100));
    }
    get progressStyle() {
        return `width:${this.progressPercent}%`;
    }

    get statusChips() {
        return (this.d.statusStats || []).map((s) => ({
            label: s.label,
            count: this.num(s.count),
            value: this.money(s.value),
            cssClass: `chip ${STATUS_CLASS[s.label] || 'is-draft'}`
        }));
    }

    // ---------- overview funnel (NEW — fully dynamic, no hardcoded stage list) ----------

    // statuses that represent "exited the flow" rather than a funnel stage —
    // these are summarized in the note line under the funnel instead of getting their own bar
    static TERMINAL_STATUSES = ['Rejected', 'Denied'];

    // gradient endpoints sampled from the reference image — every bar's color
    // is interpolated between these two based on its rank, so this works
    // for any number of statuses without needing one CSS class per stage
    static FUNNEL_COLOR_START = [15, 42, 74];   // #0f2a4a
    static FUNNEL_COLOR_END = [107, 178, 240];  // #6bb2f0

    lerpColor(t) {
        const [r1, g1, b1] = QuoteForceDashboard.FUNNEL_COLOR_START;
        const [r2, g2, b2] = QuoteForceDashboard.FUNNEL_COLOR_END;
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        return { r, g, b, hex: `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}` };
    }

    // picks readable text color (white or dark navy) against whatever the
    // interpolated bar color turns out to be, using standard relative luminance
    readableTextColor({ r, g, b }) {
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.6 ? '#0b233d' : '#ffffff';
    }

    get funnelStages() {
        const stats = this.d.statusStats || [];
        const terminal = QuoteForceDashboard.TERMINAL_STATUSES;

        // build the stage list directly from whatever statuses the data contains —
        // no fixed labels, so new/renamed statuses show up automatically
        const stages = stats
            .filter((s) => !terminal.includes(s.label))
            .map((s) => ({
                key: s.label,
                label: s.label,
                count: Number(s.count) || 0
            }))
            .filter((s) => s.count > 0);

        if (stages.length === 0) {
            return [];
        }

        // largest count first, so the funnel actually tapers
        stages.sort((a, b) => b.count - a.count);

        const max = stages[0].count;
        const lastIndex = Math.max(1, stages.length - 1);

        return stages.map((s, i) => {
            const pct = Math.max(6, Math.round((s.count / max) * 100));
            const t = i / lastIndex; // 0 for the biggest bar, 1 for the smallest
            const color = this.lerpColor(t);
            const textColor = this.readableTextColor(color);

            return {
                key: s.key,
                label: s.label,
                count: this.num(s.count),
                cssClass: 'qf-funnel-row',
                // width + color are both computed at runtime, not tied to a fixed CSS class
                rowStyle:
                    (i === 0 ? `width:${pct}%` : `width:${pct}%; margin:0 auto`) +
                    `; background:${color.hex}; color:${textColor}`
            };
        });
    }

    get rejectedCount() {
        const stats = this.d.statusStats || [];
        const count = stats
            .filter((s) => QuoteForceDashboard.TERMINAL_STATUSES.includes(s.label))
            .reduce((sum, s) => sum + (Number(s.count) || 0), 0);
        return this.num(count);
    }

    // ---------- opportunity index (donut) ----------
    get oppTotal() {
        return (this.d.wonCount || 0) + (this.d.inProgressCount || 0) + (this.d.lostCount || 0);
    }
    get oppTotalLabel() { return this.num(this.oppTotal); }
    get donutStyle() {
        const won = this.d.wonCount || 0;
        const prog = this.d.inProgressCount || 0;
        const lost = this.d.lostCount || 0;
        const total = won + prog + lost;
        if (total === 0) {
            return 'background: conic-gradient(#e6e9f2 0% 100%)';
        }
        const p1 = (won / total) * 100;
        const p2 = p1 + (prog / total) * 100;
        return `background: conic-gradient(#1fa97a 0% ${p1}%, #4f7cff ${p1}% ${p2}%, #eb4d4d ${p2}% 100%)`;
    }
    get wonLabel() { return this.num(this.d.wonCount); }
    get inProgressLabel() { return this.num(this.d.inProgressCount); }
    get lostLabel() { return this.num(this.d.lostCount); }

    // ---------- deal value ----------
    get wonValueLabel() { return this.money(this.d.wonValue); }
    get inProgressValueLabel() { return this.money(this.d.inProgressValue); }
    get lostValueLabel() { return this.money(this.d.lostValue); }
    get avgAgeLabel() { return `${this.num(this.d.avgQuoteAgeDays)} Days`; }

    // ---------- monthly bar chart ----------
    get bars() {
        const months = this.d.monthly || [];
        let max = 1;
        months.forEach((m) => {
            max = Math.max(max, m.won || 0, m.lost || 0);
        });
        return months.map((m) => ({
            label: m.label,
            won: m.won || 0,
            lost: m.lost || 0,
            wonStyle: `height:${Math.round(((m.won || 0) / max) * 100)}%`,
            lostStyle: `height:${Math.round(((m.lost || 0) / max) * 100)}%`
        }));
    }
    get totalWon() {
        return (this.d.monthly || []).reduce((sum, m) => sum + (m.won || 0), 0);
    }
    get totalLost() {
        return (this.d.monthly || []).reduce((sum, m) => sum + (m.lost || 0), 0);
    }

    // ---------- high value quotes ----------
    get highValueRows() {
        return (this.d.highValueQuotes || []).map((q) => ({
            id: q.id,
            name: q.name,
            customer: q.customer,
            status: q.status,
            valueLabel: this.money(q.value),
            ageLabel: `${q.ageDays}d`,
            initial: (q.customer || q.name || '?').trim().charAt(0).toUpperCase(),
            statusClass: `pill ${STATUS_CLASS[q.status] || 'is-draft'}`
        }));
    }

    // ---------- secondary stats ----------
    get productCountLabel() { return this.num(this.d.productCount); }
    get bundleCountLabel() { return this.num(this.d.bundleCount); }
    get invoiceCountLabel() { return this.num(this.d.invoiceCount); }
}