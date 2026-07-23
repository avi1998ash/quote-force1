import { LightningElement, api, track } from 'lwc';
import listTaxRules from '@salesforce/apex/TaxRuleController.listTaxRules';
import saveTaxRule from '@salesforce/apex/TaxRuleController.saveTaxRule';
import deleteTaxRule from '@salesforce/apex/TaxRuleController.deleteTaxRule';
import setDefaultTaxRule from '@salesforce/apex/TaxRuleController.setDefaultTaxRule';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const DEFAULT_RULE = {
    Name: '',
    QuoteForce__Type__c: 'Percentage',
    QuoteForce__Value__c: null,
    QuoteForce__Country__c: '',
    QuoteForce__Country_Code__c: '',
    QuoteForce__Tax_Components__c: '',
    QuoteForce__Is_Default__c: false,
    QuoteForce__Applies_To__c: 'All',
    QuoteForce__Tax_Inclusive__c: false,
    QuoteForce__HSN_SAC_Code__c: '',
    QuoteForce__GSTIN_Number__c: '',
    QuoteForce__Is_Interstate__c: false,
    QuoteForce__Active__c: true
};

export default class TaxRuleManager extends LightningElement {

    @api isEditable;
    @track loaded = false;
    @track settings = {};
    @track taxRules = [];
    @track draftRule = this.getFreshDraft();

    taxDisplayModeOptions = [
        { label: 'Tax Exclusive', value: 'Tax Exclusive' },
        { label: 'Tax Inclusive', value: 'Tax Inclusive' }
    ];
    typeOptions = [
        { label: 'Percentage', value: 'Percentage' },
        { label: 'Fixed Amount', value: 'Fixed Amount' }
    ];
    appliesToOptions = [
        { label: 'Products', value: 'Products' },
        { label: 'Services', value: 'Services' },
        { label: 'All', value: 'All' }
    ];

    connectedCallback() {
        console.log('connectedCallback — component mounted');
        this.loadRules();
    }

    get taxRuleOptions() {
        return [{ label: 'None', value: '' }, ...this.taxRules.map((rule) => ({ label: rule.Name, value: rule.Id }))];
    }

    get ruleSaveLabel() {
        return this.draftRule.Id ? 'Update Rule' : 'Create Rule';
    }

    get hasTaxRules() {
        return this.taxRules.length > 0;
    }

    getFreshDraft() {
        return JSON.parse(JSON.stringify(DEFAULT_RULE));
    }

    async loadRules() {
        console.log('loadRules called');
        this.loaded = true;
        try {
            this.taxRules = await listTaxRules();
            console.log('loadRules success — count:', this.taxRules.length, '| rules =', JSON.stringify(this.taxRules));
        } catch (error) {
            console.error('loadRules error =', error);
            console.error('error.body =', JSON.stringify(error.body));
            this.showToast('Error', error.body?.message || 'Unable to load tax rules', 'error');
        } finally {
            this.loaded = false;
        }
    }

    handleSettingChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.type === 'checkbox' ? event.target.checked : event.detail?.value ?? event.target.value;
        const normalized = value !== '' ? value : null;
        console.log(`handleSettingChange — field: "${field}", raw value: "${value}", normalized: "${normalized}"`);
        this.settings = { ...this.settings, [field]: normalized };
        console.log('settings after change =', JSON.stringify(this.settings));
        this.dispatchEvent(new CustomEvent('settingschange', { detail: { settings: this.settings } }));
    }

    handleRuleChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.type === 'checkbox' ? event.target.checked : event.detail?.value ?? event.target.value;
        console.log(`handleRuleChange — field: "${field}", value: "${value}", typeof: ${typeof value}`);
        this.draftRule = { ...this.draftRule, [field]: value };
        console.log('draftRule after change =', JSON.stringify(this.draftRule));
    }

    editRule(event) {
        const ruleId = event.currentTarget.dataset.id;
        console.log('editRule called — ruleId =', ruleId);
        const selected = this.taxRules.find((rule) => rule.Id === ruleId);
        console.log('selected rule =', JSON.stringify(selected));
        if (selected) {
            this.draftRule = { ...this.getFreshDraft(), ...selected };
            console.log('draftRule after edit load =', JSON.stringify(this.draftRule));
        }
    }

    async saveRule() {
       
        console.log('draftRule (full) =', JSON.stringify(this.draftRule));
        console.log('draftRule.Id =', this.draftRule.Id);
        console.log('draftRule.Name =', this.draftRule.Name);
        console.log('draftRule.QuoteForce__Type__c =', this.draftRule.QuoteForce__Type__c);
        console.log('draftRule.QuoteForce__Value__c =', this.draftRule.QuoteForce__Value__c, '| typeof =', typeof this.draftRule.QuoteForce__Value__c);
        console.log('draftRule.QuoteForce__Country__c =', this.draftRule.QuoteForce__Country__c);
        console.log(' draftRule.QuoteForce__Is_Default__c =', this.draftRule.QuoteForce__Is_Default__c);
        console.log(' draftRule.QuoteForce__Active__c =', this.draftRule.QuoteForce__Active__c);
        this.loaded = true;
        try {
            console.log(' Calling saveTaxRule Apex — sending payload...');
            const saved = await saveTaxRule({ taxRule: this.draftRule });
            console.log(' saveTaxRule SUCCESS — saved =', JSON.stringify(saved));
            this.showToast('Success', 'Tax rule saved', 'success');
            this.handleClear();
            await this.loadRules();
            if (saved.QuoteForce__Is_Default__c) {
                this.settings = { ...this.settings, QuoteForce__Default_Tax_Rule__c: saved.Id };
                this.dispatchEvent(new CustomEvent('settingschange', { detail: { settings: this.settings } }));
            }
        } catch (error) {
            console.error('saveRule FAILED');
            console.error('full error =', error);
            console.error('error.body =', JSON.stringify(error.body));
            console.error('error.body.message =', error.body?.message);
            console.error('error.body.fieldErrors =', JSON.stringify(error.body?.fieldErrors));
            console.error('error.body.pageErrors =', JSON.stringify(error.body?.pageErrors));
            console.error('error.body.output =', JSON.stringify(error.body?.output));
            this.showToast('Error', error.body?.message || 'Unable to save tax rule', 'error');
        } finally {
            this.loaded = false;
        }
    }

    async setDefault(event) {
        const ruleId = event.currentTarget.dataset.id;
        console.log('setDefault called — ruleId =', ruleId);
        this.loaded = true;
        try {
            const saved = await setDefaultTaxRule({ taxRuleId: ruleId });
            console.log('setDefault success — saved =', JSON.stringify(saved));
            this.settings = { ...this.settings, QuoteForce__Default_Tax_Rule__c: saved.Id };
            this.dispatchEvent(new CustomEvent('settingschange', { detail: { settings: this.settings } }));
            await this.loadRules();
        } catch (error) {
            console.error('setDefault error =', error);
            console.error('error.body =', JSON.stringify(error.body));
            this.showToast('Error', error.body?.message || 'Unable to set default tax rule', 'error');
        } finally {
            this.loaded = false;
        }
    }

    async deleteRule(event) {
        const ruleId = event.currentTarget.dataset.id;
        console.log('deleteRule called — ruleId =', ruleId);
        this.loaded = true;
        try {
            await deleteTaxRule({ taxRuleId: ruleId });
            console.log('deleteRule success');
            this.showToast('Success', 'Tax rule deleted', 'success');
            await this.loadRules();
        } catch (error) {
            console.error('deleteRule error =', error);
            console.error('error.body =', JSON.stringify(error.body));
            this.showToast('Error', error.body?.message || 'Unable to delete tax rule', 'error');
        } finally {
            this.loaded = false;
        }
    }

    handleClear() {
        console.log('handleClear called — resetting draftRule');
        this.draftRule = this.getFreshDraft();
        console.log('draftRule after clear =', JSON.stringify(this.draftRule));
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}