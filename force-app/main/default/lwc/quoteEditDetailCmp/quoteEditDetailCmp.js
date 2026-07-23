import { LightningElement, api, track } from 'lwc';
import getSectionData from '@salesforce/apex/ProductConfigurationController.getSectionDataQuote';
import getInvoiceSectionData from '@salesforce/apex/ProductConfigurationController.getInvoiceSectionData';
import deleteQuoteLineItem from '@salesforce/apex/ProductConfigurationController.deleteQuoteLineItem';
import deleteInvoiceLineItem from '@salesforce/apex/ProductConfigurationController.deleteInvoiceLineItem';
import deleteSectionRecord from '@salesforce/apex/ProductConfigurationController.deleteSection';
import deleteInvoiceSection from '@salesforce/apex/ProductConfigurationController.deleteInvoiceSection';
import createNewSection from '@salesforce/apex/ProductConfigurationController.createNewSectionQuote';
import createNewSectionInvoice from '@salesforce/apex/ProductConfigurationController.createNewSectionInvoice';
import createNewSectionProduct from '@salesforce/apex/ProductConfigurationController.createNewSectionProductQuote';
import createNewSectionProductInvoice from '@salesforce/apex/ProductConfigurationController.createNewSectionProductInvoice';
import updateProdSection from '@salesforce/apex/ProductConfigurationController.updateProdSection';
import updateProdLineItms from '@salesforce/apex/ProductConfigurationController.updateProdLineItms';
import insertProdLineItms from '@salesforce/apex/ProductConfigurationController.insertProdLineItms';
import updateInvoiceLineItms from '@salesforce/apex/ProductConfigurationController.updateInvoiceLineItms';
import insertInvoiceLineItms from '@salesforce/apex/ProductConfigurationController.insertInvoiceLineItms';
import getProductDetailsForContext from '@salesforce/apex/ProductConfigurationController.getProductDetailsForContext';
import getProductWithProductBundleForContext from '@salesforce/apex/ProductConfigurationController.getProductWithProductBundleForContext';
import getProductWithProductBundle from '@salesforce/apex/ProductConfigurationController.getProductWithProductBundle';
import getContextPriceBookId from '@salesforce/apex/ProductConfigurationController.getContextPriceBookId';
import listPriceBooks from '@salesforce/apex/ProductConfigureController.listPriceBooks';
import listPriceBookEntries from '@salesforce/apex/ProductConfigureController.listPriceBookEntries';

export default class QuoteEditDetailCmp extends LightningElement {
    _currency = '';
    @api recid;
    @api mode;
    @api quoteid;
    @api isinsert;
    @api recordContext = 'quote';
    @api allowCatalogManagement;
    @api allowStructureChanges;
    @api allowDeleteActions;
    @api disabled = false;  

    @track sectionList = [];
    @track priceBookOptions = [];
    @track priceBookEntryOptions = [];
    @track productBundleList = [];
    @track pbListRec = [];
    @track getProductBundleList = [];
    @track getProductLineItemList = [];
    @track selectedProdBundleName;
    @track alredyExistBundleModal = false;
    @track bundleSelectModel = false;
    @track selectedBundleCurrency = '';

    // Added tracking variables for confirmation popups
    @track showDeleteSectionModal = false;
    @track showDeleteItemModal = false;
    @track showCurrencyError = false;

    selectedDeleteItemId = null;
    selectedSectionId = null;
    selectedSectionIndex = null;

    selectedProductBundleId = '';
    selectedPriceBookId = '';
    @track priceBookSearchTerm = '';
    @track isPriceBookDropdownOpen = false;
    @track loaded = false;
    _loadingCount = 0;
    dragStartIndex;
    documentClickHandler;

    // Ref-counted loading overlay so concurrent async operations don't clear it early.
    startLoading() {
        this._loadingCount += 1;
        this.loaded = true;
    }

    stopLoading() {
        this._loadingCount = Math.max(0, this._loadingCount - 1);
        if (this._loadingCount === 0) {
            this.loaded = false;
        }
    }

    connectedCallback() {
        console.log('### STEP5 quoteEditDetailCmp connectedCallback');
        console.log('### STEP5 currency prop =>', this.currency);
        console.log('### STEP5 recid =>', this.recid);
        this.documentClickHandler = this.handleDocumentClick.bind(this);
        document.addEventListener('click', this.documentClickHandler);
        this.loadSectionData();
        this.getProductWithProductBundleRecord();
    }

    disconnectedCallback() {
        if (this.documentClickHandler) {
            document.removeEventListener('click', this.documentClickHandler);
        }
    }

    get filter() {
        return {
            criteria: [
                {
                    fieldPath: 'QuoteForce__Active__c',
                    operator: 'eq',
                    value: true,
                }
            ]
        };
    }

    get isInvoiceContext() {
        return this.recordContext === 'invoice';
    }

    // Resolves current currency (derives from selected pricebook if parent currency prop is blank)
    get effectiveCurrency() {
        if (this.selectedBundleCurrency) return this.selectedBundleCurrency;

        if (this.selectedPriceBookId) {
            const selectedPB = (this.priceBookOptions || []).find(
                opt => opt.value === this.selectedPriceBookId
            );
            const match = selectedPB?.label?.match(/\(([A-Z]{3})\)/);
            if (match) {
                return match[1];
            }
        }

        if (this.currency) return this.currency;

        return '';
    }

    get currencySymbol() {
        const symbols = {
            'EUR': '€', 'USD': '$',
            'GBP': '£', 'INR': '₹', 'AED': 'د.إ'
        };
        return symbols[this.effectiveCurrency] || this.effectiveCurrency || '';
    }

    get pricingQuoteId() {
        return this.quoteid || null;
    }

    get pricingInvoiceId() {
        return this.isInvoiceContext ? this.recid : null;
    }

    get showCatalogManagement() {
        return this.allowCatalogManagement !== false;
    }

    get showStructureChanges() {
        return this.allowStructureChanges !== false;
    }

    get showDeleteActions() {
        return this.allowDeleteActions !== false;
    }

    // Checks if pricebook should be locked (if any products exist)
    get isPriceBookLocked() {
        return this.sectionList && this.sectionList.length > 0;
    }

    @api
    get currency() {
        return this._currency;
    }

    set currency(value) {
        const normalizedValue = value || '';
        const hasChanged = this._currency !== normalizedValue;
        this._currency = normalizedValue;

        if (hasChanged && this.recid) {
            this.loadPriceBookOptions()
                .then(() => this.loadPriceBookEntryOptions())
                .catch(() => {});
            this.getProductWithProductBundleRecord();
        }
    }

    async getProductWithProductBundleRecord() {
        this.startLoading();
        try {
            const [result] = await Promise.all([
                getProductWithProductBundleForContext({
                    quoteId: this.pricingQuoteId,
                    invoiceId: this.pricingInvoiceId
                }),
                this.loadPriceBookOptions()
            ]);
            this.pbListRec = result || [];
            this.productBundleList = this.getBundleOptionsForSelectedPriceBook();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Bundle load failed', error);
        } finally {
            this.stopLoading();
        }
    }

    async loadPriceBookOptions() {
        // filter by effectiveCurrency only when locked (i.e. products exist in sectionList)
        const effectiveCurrencyFilter = this.isPriceBookLocked
            ? (this.effectiveCurrency || '')
            : '';

        console.log('[loadPriceBookOptions] isPriceBookLocked =>', this.isPriceBookLocked, 'currencyFilter =>', effectiveCurrencyFilter);

        const result = await listPriceBooks({
            searchKey: '',
            currencyFilter: effectiveCurrencyFilter,
            activeOnly: true
        });

        this.priceBookOptions = (result || []).map((priceBook) => ({
            value: priceBook.Id,
            label: priceBook.QuoteForce__Currency__c
                ? `${priceBook.Name} (${priceBook.QuoteForce__Currency__c})`
                : priceBook.Name
        }));

        if (!this.priceBookOptions.some((option) => option.value === this.selectedPriceBookId)) {
            this.resetBundleSelection();
        }
    }

    async loadPriceBookEntryOptions() {
        if (!this.selectedPriceBookId) {
            this.priceBookEntryOptions = [];
            this.refreshSectionProductOptions();
            return;
        }

        const result = await listPriceBookEntries({
            searchKey: '',
            priceBookId: this.selectedPriceBookId,
            productId: null,
            currencyFilter: this.effectiveCurrency || '',
            activeOnly: true
        });

        this.priceBookEntryOptions = (result || []).map((entry) => ({
            value: entry.Id,
            label: entry.QuoteForce__Product__r?.QuoteForce__Product_Code__c
                ? `${entry.QuoteForce__Product__r.Name} (${entry.QuoteForce__Product__r.QuoteForce__Product_Code__c})`
                : (entry.QuoteForce__Product__r?.Name || entry.Name),
            productId: entry.QuoteForce__Product__c,
            productName: entry.QuoteForce__Product__r?.Name || entry.Name,
            productCode: entry.QuoteForce__Product__r?.QuoteForce__Product_Code__c || '',
            unitPrice: Number(entry.QuoteForce__Unit_Price__c) || 0,
            searchText: `${entry.QuoteForce__Product__r?.Name || ''} ${entry.QuoteForce__Product__r?.QuoteForce__Product_Code__c || ''} ${entry.Name || ''}`.toLowerCase()
        }));

        this.refreshSectionProductOptions();
    }

  getBundlesForSelectedPriceBook() {
    if (!this.selectedPriceBookId) {
        return [];
    }

    return (this.pbListRec || []).filter((bundle) => {
        if (this.effectiveCurrency && bundle.CurrencyType && bundle.CurrencyType !== this.effectiveCurrency) {
            return false;
        }
        return this.bundleMatchesSelectedPriceBook(bundle, this.selectedPriceBookId);
    });
}

    bundleMatchesSelectedPriceBook(bundle, selectedPriceBookId) {
        if (!bundle || !selectedPriceBookId) {
            return false;
        }

        if (bundle.PriceBookId === selectedPriceBookId) {
            return true;
        }

        return (bundle.ProductLineItemWrapperList || []).some((item) => item.PriceBookId === selectedPriceBookId);
    }

    getBundleOptionsForSelectedPriceBook() {
        return this.getBundlesForSelectedPriceBook().map((bundle) => ({
            value: bundle.Id,
            label: `${bundle.Name} (${bundle.CurrencyType || 'No Currency'})`
        }));
    }

    getBundlePriceBookId(bundle) {
        return bundle?.PriceBookId || bundle?.ProductLineItemWrapperList?.find((item) => item.PriceBookId)?.PriceBookId || '';
    }

    getBundlePriceBookName(bundle) {
        return bundle?.PriceBookName || 'Pricebook';
    }

    resetBundleSelection() {
        this.selectedPriceBookId = '';
        this.selectedProductBundleId = '';
        this.selectedBundleCurrency = '';
        this.selectedProdBundleName = '';
        this.alredyExistBundleModal = false;
        this.bundleSelectModel = false;
        this.getProductBundleList = [];
        this.getProductLineItemList = [];
        this.productBundleList = [];
        this.priceBookEntryOptions = [];
        this.refreshSectionProductOptions();
    }

    async handlePriceBookChange(event) {
        this.selectedPriceBookId = event.detail.value;
        this.selectedProductBundleId = '';
        this.selectedBundleCurrency = '';
        this.selectedProdBundleName = '';
        this.alredyExistBundleModal = false;
        this.bundleSelectModel = false;
        this.getProductBundleList = [];
        this.getProductLineItemList = [];
        // Re-fetch bundles for the newly selected pricebook's currency. pbListRec was
        // originally loaded for the quote's currency only, so without this a user who
        // deletes the current bundle and switches to a pricebook of a different
        // currency would see no bundles even though they exist for that pricebook.
        await this.refreshBundlesForSelectedPriceBook();
        this.productBundleList = this.getBundleOptionsForSelectedPriceBook();
        await this.loadPriceBookEntryOptions();
    }

    // Loads the bundle catalog for the currently selected pricebook's currency.
    async refreshBundlesForSelectedPriceBook() {
        if (!this.selectedPriceBookId) {
            this.pbListRec = [];
            return;
        }
        try {
            const result = await getProductWithProductBundle({
                currencyCode: this.effectiveCurrency || ''
            });
            this.pbListRec = result || [];
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Bundle refresh failed', error);
            this.pbListRec = [];
        }
    }

    handleDocumentClick() {
        this.isPriceBookDropdownOpen = false;
        this.closeSectionEntryDropdowns();
    }

    handleDropdownContainerClick(event) {
        event.stopPropagation();
    }

    openPriceBookDropdown(event) {
        event.stopPropagation();
        this.isPriceBookDropdownOpen = true;
        this.priceBookSearchTerm = '';
    }

    handlePriceBookSearch(event) {
        this.priceBookSearchTerm = event.detail?.value ?? event.target.value ?? '';
        this.isPriceBookDropdownOpen = true;
    }

    async handlePriceBookOptionSelect(event) {
        this.isPriceBookDropdownOpen = false;
        this.priceBookSearchTerm = '';
        await this.handlePriceBookChange({
            detail: {
                value: event.currentTarget.dataset.value
            }
        });
    }

    handleChangeProductBundle(event) {
        const pbId = event.target.value;
        this.alredyExistBundleModal = false;
        this.selectedProductBundleId = pbId;
        this.getProductBundleList = [];
        this.getProductLineItemList = [];

        const selectedBundle = this.getBundlesForSelectedPriceBook().find((bundle) => bundle.Id === pbId);
        this.selectedBundleCurrency = selectedBundle?.CurrencyType || '';
        this.selectedProdBundleName = selectedBundle?.Name || '';

        // Validation for Currency Mismatch
        if (selectedBundle && this.effectiveCurrency && selectedBundle.CurrencyType !== this.effectiveCurrency) {
            this.showCurrencyError = true;
            this.selectedProductBundleId = '';
            return;
        }

        if (this.sectionList.some(section => section.title === this.selectedProdBundleName)) {
            this.alredyExistBundleModal = true;
            return;
        }

        if (!selectedBundle) {
            return;
        }

        this.bundleSelectModel = true;
        this.getProductBundleList = [selectedBundle];
        this.getProductLineItemList = (selectedBundle.ProductLineItemWrapperList || [])
            .filter((item) => item.PriceBookId === this.selectedPriceBookId)
            .map(item => ({
                Id: item.Id,
                Name: item.Name,
                UnitOfMeasurement: item.UnitOfMeasurement,
                macProCheck: true,
                Qty: item.Qty,
                productName: item.productName,
                Price: item.unitCost,
                PriceBookEntryId: item.PriceBookEntryId,
                QuoteForce__Product_Bundle__c: this.selectedProductBundleId,
            }));
    }

    handleProductLineItemCheckboxChange(event) {
        const productId = event.currentTarget.dataset.id;
        this.getProductLineItemList = this.getProductLineItemList.map(element => (
            element.Id === productId
                ? { ...element, macProCheck: !element.macProCheck }
                : element
        ));
    }

    closeModal() {
        this.bundleSelectModel = false;
        this.selectedProductBundleId = '';
    }

    alredyExistCloseModal() {
        this.alredyExistBundleModal = false;
    }

    closeCurrencyModal() {
        this.showCurrencyError = false;
    }

    handleCreateProuctListItem() {
        this.newProductLineItems();
    }

    async newProductLineItems() {
        this.bundleSelectModel = false;
        this.startLoading();
        try {
            const sectionResult = this.isInvoiceContext
                ? await createNewSectionInvoice({ invoiceId: this.recid, sectionName: this.selectedProdBundleName })
                : await createNewSection({ quoteId: this.quoteid, sectionName: this.selectedProdBundleName });

            const selectedItems = this.getProductLineItemList
                .filter(element => element.macProCheck);

            const inserts = selectedItems
                .filter(element => element.macProCheck)
                .map(element => {
                    if (this.isInvoiceContext) {
                        return insertInvoiceLineItms({
                            invoiceLineItemObj: {
                                QuoteForce__Invoice__c: this.recid,
                                QuoteForce__Section_Id__c: sectionResult.Id,
                                QuoteForce__Product_Custom__c: element.productName,
                                QuoteForce__Quantity__c: Number(element.Qty) || 1,
                                QuoteForce__Price__c: Number(element.Price) || 0,
                                QuoteForce__Price_Book_Entry__c: element.PriceBookEntryId || null,
                                QuoteForce__Currency__c: this.effectiveCurrency,
                                QuoteForce__Type__c: 'Invoice Product'
                            }
                        });
                    }

                    return insertProdLineItms({
                        prod_lin_itms_obj: {
                            QuoteForce__Quotes__c: this.quoteid,
                            QuoteForce__Type__c: 'Quote Product',
                            QuoteForce__Product_Section__c: sectionResult.Id,
                            QuoteForce__Product__c: element.productName,
                            QuoteForce__Quantity__c: Number(element.Qty) || 1,
                            QuoteForce__Price__c: Number(element.Price) || 0,
                            QuoteForce__Price_Book_Entry__c: element.PriceBookEntryId || null,
                            QuoteForce__Currency__c: this.effectiveCurrency
                        }
                    });
                });

            const insertedRows = await Promise.all(inserts);
            this.appendBundleSectionToUi(sectionResult, selectedItems, insertedRows);
            await this.loadSectionData();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Bundle add failed', error);
        } finally {
            this.stopLoading();
        }
    }

    @api
    async loadSectionData() {
          console.log('### loadSectionData START — quoteid:', this.quoteid, '| recid:', this.recid);
        this.startLoading();
        try {
            const data = this.isInvoiceContext
                ? await getInvoiceSectionData({ invoiceId: this.recid })
                : await getSectionData({ quoteId: this.quoteid });

                 console.log('### loadSectionData data =>', JSON.stringify(data));
        console.log('### loadSectionData data length =>', data ? data.length : 'null/undefined');

            this.sectionList = (data || []).map(section => {
                const sectionId = this.isInvoiceContext ? section.sectionId : section.Id;
                const items = this.isInvoiceContext ? (section.lineItems || []) : (section.QuoteForce__QuoteLineItems__r || []);
                const products = items.map(item => this.buildSectionProductRow({
                    id: this.isInvoiceContext ? item.itemId : item.Id,
                    prodId: this.isInvoiceContext ? item.productId : item.QuoteForce__Product__c,
                    productName: this.isInvoiceContext
                        ? (item.productName || '')
                        : (item.QuoteForce__Price_Book_Entry__r?.QuoteForce__Product__r?.Name || item.QuoteForce__Product__r?.Name || ''),
                    productCode: this.isInvoiceContext
                        ? (item.productCode || '')
                        : (item.QuoteForce__Price_Book_Entry__r?.QuoteForce__Product__r?.QuoteForce__Product_Code__c || item.QuoteForce__Product__r?.QuoteForce__Product_Code__c || ''),
                    priceBookEntryId: this.isInvoiceContext ? item.priceBookEntryId : item.QuoteForce__Price_Book_Entry__c,
                    priceBookId: this.isInvoiceContext ? item.priceBookId : item.QuoteForce__Price_Book_Entry__r?.QuoteForce__Price_Book__c,
                    Quantity: Number(this.isInvoiceContext ? item.quantity : item.QuoteForce__Quantity__c) || 0,
                    Price: Number(this.isInvoiceContext ? item.price : item.QuoteForce__Price__c) || 0,
                    MeasurementType: this.isInvoiceContext ? item.unitOfMeasurement : item.QuoteForce__Unit_Of_Measurement__c,
                    taxAmount: this.isInvoiceContext ? item.taxAmount : item.QuoteForce__Tax_Amount__c,
                    lineTotal: this.isInvoiceContext ? item.lineTotal : item.QuoteForce__Line_Total__c,
                    hsnSacCode: this.isInvoiceContext ? item.hsnSacCode : item.QuoteForce__HSN_SAC_Code__c,
                    taxBreakdownJson: this.isInvoiceContext ? item.taxBreakdownJson : item.QuoteForce__Tax_Breakdown_JSON__c
                }));

                return {
                    id: sectionId,
                    title: this.isInvoiceContext ? section.sectionName : section.Name,
                    notes: this.isInvoiceContext ? section.notes : section.QuoteForce__Notes__c,
                    total: products.reduce((sum, product) => sum + Number(product.lineTotal || 0), 0),
                    products
                };
            }).filter(section => section.products.length > 0);
            await this.ensureSelectedPriceBookLoaded();

            await this.loadPriceBookEntryOptions();
            this.notifySectionChange();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Section load failed', error);
        } finally {
            this.stopLoading();
        }
    }

    recalculateTotals() {
        this.sectionList = this.sectionList.map(section => ({
            ...section,
            total: section.products.reduce((sum, product) => sum + Number(product.lineTotal || 0), 0)
        }));
        this.notifySectionChange();
    }

    notifySectionChange() {
        // this.dispatchEvent(new CustomEvent('sectionchange', {
        //     detail: {
        //         sections: this.sectionList
        //     },
        //     bubbles: true,
        //     composed: true
        // }));
    }

    // Opens row delete confirmation modal
    deleteRow(event) {
        const prodId = event.currentTarget.dataset.id || event.target.dataset.id;
        if (!prodId) return;
        this.selectedDeleteItemId = prodId;
        this.showDeleteItemModal = true;
    }

    closeDeleteItemModal() {
        this.showDeleteItemModal = false;
        this.selectedDeleteItemId = null;
    }

    // Handles the actual delete confirmation of a row
    async confirmDeleteItem() {
        const prodId = this.selectedDeleteItemId;
        this.showDeleteItemModal = false;
        this.selectedDeleteItemId = null;

        this.startLoading();
        try {
            for (const section of this.sectionList) {
                const index = section.products.findIndex(product => product.id === prodId);
                if (index === -1) {
                    continue;
                }

                if (prodId && !prodId.startsWith('temp_')) {
                    if (this.isInvoiceContext) {
                        await deleteInvoiceLineItem({ itemId: prodId });
                    } else {
                        await deleteQuoteLineItem({ itemId: prodId });
                    }
                }

                section.products.splice(index, 1);
                break;
            }

            this.recalculateTotals();
        } finally {
            this.stopLoading();
        }
    }

    // Opens section delete confirmation modal
    handleDeleteSection(event) {
        this.selectedSectionId = event.currentTarget.dataset.id;
        this.selectedSectionIndex = Number(event.currentTarget.dataset.index);
        this.showDeleteSectionModal = true;
    }

    closeDeleteSectionModal() {
        this.showDeleteSectionModal = false;
        this.selectedSectionId = null;
        this.selectedSectionIndex = null;
    }

    // Handles the actual delete confirmation of a section
    async confirmDeleteSection() {
        const sectionId = this.selectedSectionId;
        const secIndex = this.selectedSectionIndex;
        this.showDeleteSectionModal = false;
        this.selectedSectionId = null;
        this.selectedSectionIndex = null;

        this.startLoading();
        try {
            if (sectionId) {
                if (this.isInvoiceContext) {
                    await deleteInvoiceSection({ sectionId });
                } else {
                    await deleteSectionRecord({ sectionId });
                }
            }

            if (secIndex !== null && secIndex !== undefined) {
                this.sectionList.splice(secIndex, 1);
            }

            this.recalculateTotals();

            // Refresh pricebooks when all sections are deleted (lock released)
            if (!this.isPriceBookLocked) {
                await this.loadPriceBookOptions();
            }
        } finally {
            this.stopLoading();
        }
    }

    DragStart(event) {
        this.dragStartIndex = event.currentTarget.title;
    }

    DragOver(event) {
        event.preventDefault();
    }

    Drop(event) {
        const endIndex = Number(event.currentTarget.title);
        const startIndex = Number(this.dragStartIndex);
        const draggedItem = this.sectionList[startIndex];
        this.sectionList.splice(startIndex, 1);
        this.sectionList.splice(endIndex, 0, draggedItem);
        this.dragStartIndex = null;
    }

    addSection() {
        const sectionName = `Section ${this.sectionList.length + 1}`;
        const sectionPromise = this.isInvoiceContext
            ? createNewSectionInvoice({ invoiceId: this.recid, sectionName })
            : createNewSection({ quoteId: this.quoteid, sectionName });

        sectionPromise
            .then(result => {
                this.sectionList = [
                    ...this.sectionList,
                    {
                        id: result.Id,
                        title: result.Name,
                        notes: '',
                        products: [],
                        total: 0
                    }
                ];
                return this.addRowToSection(result.Id);
            })
            .catch(error => {
                // eslint-disable-next-line no-console
                console.error('Section create failed', error);
            });
    }

    addRowSectionProduct(event) {
        this.addRowToSection(event.currentTarget.dataset.id);
    }

    addRowToSection(sectionId) {
        const section = this.sectionList.find(current => current.id === sectionId);
        const itemPromise = this.isInvoiceContext
            ? createNewSectionProductInvoice({ invoiceId: this.recid, sectionId })
            : createNewSectionProduct({ quoteId: this.quoteid, sectionId });

        return itemPromise
            .then(result => {
                if (!section) {
                    return;
                }
                const newRow = this.buildSectionProductRow({
                    id: result.Id,
                    prodId: null,
                    productName: '',
                    productCode: '',
                    priceBookEntryId: '',
                    priceBookId: this.selectedPriceBookId,
                    Quantity: 1,
                    Price: 0
                });
                this.sectionList = (this.sectionList || []).map(current => (
                    current.id === sectionId
                        ? {
                            ...current,
                            products: [...(current.products || []), newRow]
                        }
                        : current
                ));
                this.recalculateTotals();
            })
            .catch(error => {
                // eslint-disable-next-line no-console
                console.error('Row create failed', error);
            });
    }

    handleSectionTitle(event) {
        const sectionId = event.currentTarget.dataset.id;
        const value = event.target.value;
        this.sectionList = (this.sectionList || []).map(section => (
            section.id === sectionId
                ? { ...section, title: value }
                : section
        ));
        // this.notifySectionChange();
        this.updateProductSection({
            Id: sectionId,
            Name: value
        });
    }

    handleSectionNote(event) {
        const sectionId = event.currentTarget.dataset.id;
        const value = event.target.value;
        this.sectionList = (this.sectionList || []).map(section => (
            section.id === sectionId
                ? { ...section, notes: value }
                : section
        ));
        this.notifySectionChange();
        this.updateProductSection({
            Id: sectionId,
            QuoteForce__Notes__c: value
        });
    }

    buildSectionProductRow(row) {
        const quantity = Number(row.Quantity) || 0;
        const price = Number(row.Price) || 0;
        const subtotal = quantity * price;
        const lineTotal = row.lineTotal !== undefined && row.lineTotal !== null
            ? Number(row.lineTotal) || 0
            : subtotal;
        const taxAmount = row.taxAmount !== undefined && row.taxAmount !== null
            ? Number(row.taxAmount) || 0
            : 0;
        const taxBreakdownText = this.formatTaxBreakdown(row.taxBreakdownJson);
        const normalizedSearchTerm = (row.entrySearchTerm || '').trim().toLowerCase();
        const filteredEntryOptions = normalizedSearchTerm
            ? (this.priceBookEntryOptions || []).filter((option) => option.searchText.includes(normalizedSearchTerm))
            : [...(this.priceBookEntryOptions || [])];

        return {
            id: row.id,
            prodId: row.prodId || '',
            productName: row.productName || '',
            productCode: row.productCode || '',
            priceBookEntryId: row.priceBookEntryId || '',
            priceBookId: row.priceBookId || this.selectedPriceBookId || '',
            priceBookEntryLabel: row.priceBookEntryLabel || this.formatPriceBookEntryLabel(row.productName, row.productCode),
            entrySearchTerm: row.entrySearchTerm || '',
            isEntryDropdownOpen: row.isEntryDropdownOpen || false,
            filteredEntryOptions,
            hasFilteredEntryOptions: filteredEntryOptions.length > 0,
            Quantity: quantity,
            Price: price,
            MeasurementType: row.MeasurementType,
            subtotal,
            taxAmount,
            taxBreakdownJson: row.taxBreakdownJson || '',
            taxBreakdownText,
            hsnSacCode: row.hsnSacCode || '',
            taxPending: row.taxPending === true,
            hasTaxDetails: taxAmount > 0 || !!taxBreakdownText || !!row.hsnSacCode,
            lineTotal
        };
    }

    formatTaxBreakdown(breakdownJson) {
        if (!breakdownJson) {
            return '';
        }

        try {
            const items = JSON.parse(breakdownJson);
            if (!Array.isArray(items)) {
                return '';
            }

            return items
                .map((item) => {
                    const name = item?.name || 'Tax';
                    const amount = Number(item?.amount);
                    const rate = Number(item?.rate);

                    if (!Number.isNaN(rate) && rate > 0) {
                        return `${name} ${rate}%`;
                    }
                    if (!Number.isNaN(amount) && amount > 0) {
                        return `${name} ${amount.toFixed(2)}`;
                    }
                    return name;
                })
                .filter(Boolean)
                .join(', ');
        } catch (error) {
            return '';
        }
    }

    refreshSectionProductOptions() {
        this.sectionList = (this.sectionList || []).map(section => ({
            ...section,
            products: (section.products || []).map(product => this.buildSectionProductRow(product))
        }));
    }

    inferSelectedPriceBookIdFromSections() {
        for (const section of this.sectionList || []) {
            const matchingProduct = (section.products || []).find((product) => product.priceBookId);
            if (matchingProduct?.priceBookId) {
                return matchingProduct.priceBookId;
            }
        }
        return '';
    }

    async ensureSelectedPriceBookLoaded() {
        if (this.selectedPriceBookId) {
            return;
        }

        let resolvedPriceBookId = this.inferSelectedPriceBookIdFromSections();
        if (!resolvedPriceBookId) {
            resolvedPriceBookId = await getContextPriceBookId({
                quoteId: this.pricingQuoteId,
                invoiceId: this.pricingInvoiceId
            });
        }

        if (resolvedPriceBookId) {
            this.selectedPriceBookId = resolvedPriceBookId;
            this.productBundleList = this.getBundleOptionsForSelectedPriceBook();
        }
    }

    formatPriceBookEntryLabel(productName, productCode) {
        if (productName && productCode) {
            return `${productName} (${productCode})`;
        }
        return productName || 'Select Price Book Entry';
    }

    closeSectionEntryDropdowns() {
        let changed = false;
        this.sectionList = (this.sectionList || []).map(section => ({
            ...section,
            products: (section.products || []).map(product => {
                if (!product.isEntryDropdownOpen) {
                    return product;
                }
                changed = true;
                return { ...product, isEntryDropdownOpen: false };
            })
        }));

        if (!changed) {
            this.sectionList = [...this.sectionList];
        }
    }

    openSectionEntryDropdown(event) {
        event.stopPropagation();
        if (this.isSectionEntryPickerDisabled) {
            return;
        }

        const rowId = event.currentTarget.dataset.id;
        const sectionId = event.currentTarget.dataset.sectionid;

        this.sectionList = (this.sectionList || []).map(section => ({
            ...section,
            products: (section.products || []).map(product => ({
                ...product,
                isEntryDropdownOpen: section.id === sectionId && product.id === rowId
            }))
        }));
    }

    handleSectionEntrySearch(event) {
        const rowId = event.target.dataset.id;
        const sectionId = event.target.dataset.sectionid;
        const searchTerm = event.detail?.value ?? event.target.value ?? '';

        this.sectionList = (this.sectionList || []).map(section => ({
            ...section,
            products: (section.products || []).map(product => (
                section.id === sectionId && product.id === rowId
                    ? this.buildSectionProductRow({
                        ...product,
                        entrySearchTerm: searchTerm,
                        isEntryDropdownOpen: true
                    })
                    : product
            ))
        }));
    }

    handleSectionEntryOptionSelect(event) {
        const rowId = event.currentTarget.dataset.id;
        const sectionId = event.currentTarget.dataset.sectionid;
        const entryId = event.currentTarget.dataset.value;
        const selectedEntry = (this.priceBookEntryOptions || []).find((option) => option.value === entryId);
        if (!selectedEntry) {
            return;
        }

        const existingSection = (this.sectionList || []).find((section) => section.id === sectionId);
        const existingProduct = existingSection?.products?.find((product) => product.id === rowId);
        const quantity = Number(existingProduct?.Quantity) > 0 ? Number(existingProduct.Quantity) : 1;
        const price = Number(selectedEntry.unitPrice || 0);

        this.updateProductSectionLineItms(
            this.isInvoiceContext
                ? {
                    Id: rowId,
                    QuoteForce__Product_Custom__c: selectedEntry.productId,
                    QuoteForce__Price_Book_Entry__c: entryId,
                    QuoteForce__Price__c: price,
                    QuoteForce__Quantity__c: quantity,
                    QuoteForce__Currency__c: this.effectiveCurrency
                }
                : {
                    Id: rowId,
                    QuoteForce__Product__c: selectedEntry.productId,
                    QuoteForce__Price_Book_Entry__c: entryId,
                    QuoteForce__Price__c: price,
                    QuoteForce__Quantity__c: quantity,
                    QuoteForce__Currency__c: this.effectiveCurrency
                }
        );

        this.updateLocalProduct(sectionId, rowId, {
            prodId: selectedEntry.productId,
            productName: selectedEntry.productName,
            productCode: selectedEntry.productCode,
            priceBookEntryId: entryId,
            priceBookId: this.selectedPriceBookId,
            priceBookEntryLabel: selectedEntry.label,
            entrySearchTerm: '',
            isEntryDropdownOpen: false,
            Quantity: quantity,
            Price: price,
            taxAmount: 0,
            taxBreakdownJson: '',
            taxPending: true,
            lineTotal: quantity * price
        });
    }

    handleProduct(event) {
        const rowId = event.currentTarget.dataset.id;
        const sectionId = event.currentTarget.dataset.sectionid;
        const productId = event.target.value;

        if (!productId) {
            this.updateProductSectionLineItms(
                this.isInvoiceContext
                    ? {
                        Id: rowId,
                        QuoteForce__Product_Custom__c: null,
                        QuoteForce__Quantity__c: 1,
                        QuoteForce__Price__c: 0,
                        QuoteForce__Currency__c: this.effectiveCurrency
                    }
                    : {
                        Id: rowId,
                        QuoteForce__Product__c: null,
                        QuoteForce__Quantity__c: 1,
                        QuoteForce__Price__c: 0,
                        QuoteForce__Currency__c: this.effectiveCurrency
                    }
            );
            this.updateLocalProduct(sectionId, rowId, {
                prodId: null,
                Quantity: 0,
                Price: 0,
                taxAmount: 0,
                taxBreakdownJson: '',
                taxPending: false,
                lineTotal: 0
            });
            return;
        }

        getProductDetailsForContext({
            productId,
            quoteId: this.pricingQuoteId,
            invoiceId: this.pricingInvoiceId
        })
            .then(data => {
                const price = Number(data.defaultPrice) || 0;
                const quantity = Number(data.defaultQuantity) || 1;
                this.updateProductSectionLineItms(
                    this.isInvoiceContext
                        ? {
                            Id: rowId,
                            QuoteForce__Product_Custom__c: productId,
                            QuoteForce__Price__c: price,
                            QuoteForce__Quantity__c: quantity,
                            QuoteForce__Currency__c: data.currencyCode || this.effectiveCurrency
                        }
                        : {
                            Id: rowId,
                            QuoteForce__Product__c: productId,
                            QuoteForce__Price__c: price,
                            QuoteForce__Quantity__c: quantity,
                            QuoteForce__Currency__c: data.currencyCode || this.effectiveCurrency
                        }
                );
                this.updateLocalProduct(sectionId, rowId, {
                    prodId: productId,
                    productName: data.name,
                    Quantity: quantity,
                    Price: price,
                    taxAmount: 0,
                    taxBreakdownJson: '',
                    taxPending: true,
                    lineTotal: quantity * price
                });
            })
            .catch(error => {
                // eslint-disable-next-line no-console
                console.error('Product pricing load failed', error);
            });
    }

    handleProductQuantity(event) {
        const rowId = event.currentTarget.dataset.id;
        const sectionId = event.currentTarget.dataset.sectionid;
        const quantity = Number(event.target.value) || 0;
        this.updateProductSectionLineItms({
            Id: rowId,
            QuoteForce__Quantity__c: quantity
        });
        this.updateLocalProduct(sectionId, rowId, product => ({
            Quantity: quantity,
            taxAmount: 0,
            taxBreakdownJson: '',
            taxPending: true,
            lineTotal: quantity * Number(product.Price || 0)
        }));
    }

    handleProductPrice(event) {
        const rowId = event.currentTarget.dataset.id;
        const sectionId = event.currentTarget.dataset.sectionid;
        const price = Number(event.target.value) || 0;
        this.updateProductSectionLineItms({
            Id: rowId,
            QuoteForce__Price__c: price
        });
        this.updateLocalProduct(sectionId, rowId, product => ({
            Price: price,
            taxAmount: 0,
            taxBreakdownJson: '',
            taxPending: true,
            lineTotal: Number(product.Quantity || 0) * price
        }));
    }

    updateProductSection(payload) {
        updateProdSection({ prod_sec_obj: payload }).catch(error => {
            // eslint-disable-next-line no-console
            console.error('Section update failed', error);
        });
    }

    updateProductSectionLineItms(payload) {
        const normalizedPayload = this.isInvoiceContext
            ? {
                ...payload,
                QuoteForce__Invoice__c: payload.QuoteForce__Invoice__c || this.recid,
                QuoteForce__Currency__c: payload.QuoteForce__Currency__c || this.effectiveCurrency
            }
            : {
                ...payload,
                QuoteForce__Quotes__c: payload.QuoteForce__Quotes__c || this.quoteid,
                QuoteForce__Currency__c: payload.QuoteForce__Currency__c || this.effectiveCurrency
            };

        const savePromise = this.isInvoiceContext
            ? updateInvoiceLineItms({ invoiceLineItemObj: normalizedPayload })
            : updateProdLineItms({ prod_lin_itms_obj: normalizedPayload });

        savePromise.catch(error => {
            // eslint-disable-next-line no-console
            console.error('Line update failed', error);
        });
    }

    updateLocalProduct(sectionId, rowId, update) {
        this.sectionList = (this.sectionList || []).map(section => {
            if (section.id !== sectionId) {
                return section;
            }

            return {
                ...section,
                products: (section.products || []).map(product => {
                    if (product.id !== rowId) {
                        return product;
                    }

                    const patch = typeof update === 'function' ? update(product) : update;
                    return this.buildSectionProductRow({
                        ...product,
                        ...patch
                    });
                })
            };
        });
        this.recalculateTotals();
    }

    appendBundleSectionToUi(sectionRecord, selectedItems, insertedRows) {
        const products = (selectedItems || []).map((item, index) => this.buildSectionProductRow({
            id: insertedRows?.[index]?.Id || item.Id,
            prodId: item.productName,
            productName: item.Name,
            productCode: '',
            priceBookEntryId: item.PriceBookEntryId || '',
            priceBookId: this.selectedPriceBookId,
            priceBookEntryLabel: this.formatPriceBookEntryLabel(item.Name, ''),
            Quantity: Number(item.Qty) || 1,
            Price: Number(item.Price) || 0,
            MeasurementType: item.UnitOfMeasurement
        }));

        const newSection = {
            id: sectionRecord.Id,
            title: sectionRecord.Name,
            notes: sectionRecord.QuoteForce__Notes__c || '',
            total: products.reduce((sum, product) => sum + Number(product.lineTotal || 0), 0),
            products
        };

        this.sectionList = [...this.sectionList, newSection];
    }

    get bundleSelectionHint() {
        if (!this.selectedPriceBookId) {
            return 'Select a pricebook to view bundles.';
        }
        if (!this.productBundleList.length) {
            return 'No bundles are available for the selected pricebook.';
        }
        if (this.effectiveCurrency && this.selectedBundleCurrency) {
            return `Only bundles in ${this.effectiveCurrency} can be added. Selected bundle is ${this.selectedBundleCurrency}.`;
        }
        if (this.effectiveCurrency) {
            return `Only bundles in ${this.effectiveCurrency} can be added.`;
        }
        return 'Select a bundle to view its currency.';
    }

    get isBundleSelectionDisabled() {
        return !this.selectedPriceBookId || !this.productBundleList.length;
    }

    get isSectionEntryPickerDisabled() {
        return !this.selectedPriceBookId || !this.priceBookEntryOptions.length || this.disabled;
    }

    get filteredPriceBookOptions() {
        const normalizedSearchTerm = (this.priceBookSearchTerm || '').trim().toLowerCase();

        if (!normalizedSearchTerm) {
            return this.priceBookOptions || [];
        }

        return (this.priceBookOptions || []).filter((option) =>
            (option.label || '').toLowerCase().includes(normalizedSearchTerm)
        );
    }

    get hasFilteredPriceBookOptions() {
        return this.filteredPriceBookOptions.length > 0;
    }

    get selectedPriceBookLabel() {
        const selectedPriceBook = (this.priceBookOptions || []).find((option) => option.value === this.selectedPriceBookId);
        return selectedPriceBook?.label || 'Select Pricebook';
    }

    get priceBookComboboxClass() {
        return `custom-combobox__control${this.isPriceBookDropdownOpen ? ' custom-combobox__control--open' : ''}`;
    }

    get currencyMismatchMessage() {
        if (this.effectiveCurrency && this.selectedBundleCurrency) {
            return `This bundle uses ${this.selectedBundleCurrency}, but the current quote uses ${this.effectiveCurrency}.`;
        }
        return 'This bundle does not belong to the selected currency.';
    }

    get currencyBadgeLabel() {
        return this.effectiveCurrency ? `Current Quote Currency: ${this.effectiveCurrency}` : 'Current Quote Currency: Not Set';
    }

    get selectedBundleCurrencyLabel() {
        return this.selectedBundleCurrency ? `Selected Bundle Currency: ${this.selectedBundleCurrency}` : '';
    }
}