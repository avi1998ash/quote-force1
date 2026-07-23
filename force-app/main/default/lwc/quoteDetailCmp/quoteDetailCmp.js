import { LightningElement, api, track } from 'lwc';
import getSectionData from '@salesforce/apex/ProductConfigurationController.getSectionData';
import deleteQuoteLineItem from '@salesforce/apex/ProductConfigurationController.deleteQuoteLineItem';
import deleteSectionRecord from '@salesforce/apex/ProductConfigurationController.deleteSection';
import createNewSection from '@salesforce/apex/ProductConfigurationController.createNewSection';
import createNewSectionProduct from '@salesforce/apex/ProductConfigurationController.createNewSectionProduct';
import updateProdSection from '@salesforce/apex/ProductConfigurationController.updateProdSection';
import updateProdLineItms from '@salesforce/apex/ProductConfigurationController.updateProdLineItms';
import insertProdLineItms from '@salesforce/apex/ProductConfigurationController.insertProdLineItms';
import getProductDetailsForContext from '@salesforce/apex/ProductConfigurationController.getProductDetailsForContext';
import getProductWithProductBundle from '@salesforce/apex/ProductConfigurationController.getProductWithProductBundle';
import listPriceBooks from '@salesforce/apex/ProductConfigureController.listPriceBooks';
import listPriceBookEntries from '@salesforce/apex/ProductConfigureController.listPriceBookEntries';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class QuoteDetailCmp extends LightningElement {
    _currency;
    _recid;
    tempIdCounter = 0;

    get filter() {
        const criteria = [
            {
                fieldPath: 'QuoteForce__Active__c',
                operator: 'eq',
                value: true
            }
        ];

        if (this.currency) {
            criteria.push({
                fieldPath: 'QuoteForce__Currency__c',
                operator: 'eq',
                value: this.currency
            });
        }

        return { criteria };
    }

    @api mode;
    @api quoteid;
    @api isinsert;

    @track loaded = false;

    @track sectionList = [];
    @track priceBookOptions = [];
    @track priceBookEntryOptions = [];

    selectedProductBundleId = '';
    selectedPriceBookId = '';

    @track priceBookSearchTerm = '';
    @track isPriceBookDropdownOpen = false;
    @track productBundleList = [];
    @track selectedBundleCurrency = '';

    @track pbListRec;


    dragStartIndex;

    @track getProductBundleList = [];
    @track getProductLineItemList = [];

    @track selectedProdBundleName;

    @track alredyExistBundleModal = false;
    @track bundleSelectModel = false;
    @track prodBundleAvailable = false;
    
    showDeleteSectionModal = false;
    @api savedPriceBookId;
    @track showDeleteItemModal = false;
    selectedDeleteItemId = null;

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

confirmDeleteItem() {
    const prodId = this.selectedDeleteItemId;
    this.showDeleteItemModal = false;
    this.selectedDeleteItemId = null;

    if (this.isTemporaryId(prodId)) {
        this.sectionList = this.sectionList.map(section => ({
            ...section,
            products: section.products.filter(p => p.id !== prodId)
        }));
        this.recalculateTotals();
        return;
    }

    deleteQuoteLineItem({ itemId: prodId })
        .then(() => {
            this.sectionList = this.sectionList.map(section => ({
                ...section,
                products: section.products.filter(p => p.id !== prodId)
            }));
            this.sectionList = [...this.sectionList];
            this.recalculateTotals();
        })
        .catch(error => {
            console.error('[DeleteRow] Failed:', error);
        });
}



selectedSectionId;

handleDeleteSection(event) {
    this.selectedSectionId = event.currentTarget.dataset.id;
    this.showDeleteSectionModal = true;
}

closeDeleteSectionModal() {
    this.showDeleteSectionModal = false;
}

async confirmDeleteSection() {

    const sectionIndex = this.sectionList.findIndex(
        sec => sec.id === this.selectedSectionId
    );

    if (sectionIndex === -1) {
        return;
    }

    const sectionId = this.selectedSectionId;

    this.loaded = true;
    try {
        if (this.isTemporaryId(sectionId)) {
            this.sectionList.splice(sectionIndex, 1);
        } else {
            await deleteSectionRecord({ sectionId });
            this.sectionList.splice(sectionIndex, 1);
        }

        this.sectionList = [...this.sectionList];

        this.showDeleteSectionModal = false;

        // ✅ FIX: Agar ab koi section nahi bacha (lock release ho gaya),
        // toh pricebook options refresh karo taaki saari currencies dikhe
        if (!this.isPriceBookLocked) {
            console.log('[confirmDeleteSection] Lock released, refreshing pricebook options');
            await this.loadPriceBookOptions();
        }
    } finally {
        this.loaded = false;
    }
}

    documentClickHandler;

    get recordContextId() {
        return this.recid || null;
    }

    get isDraftTemplateMode() {
        return !this.recordContextId;
    }

    @api
    get recid() {
        return this._recid;
    }

   set recid(value) {
    const normalizedValue = value || '';
    const hasChanged = this._recid !== normalizedValue;
    this._recid = normalizedValue;

    if (hasChanged && this._recid) {
        // ✅ FIX: ek microtask delay do taaki savedPriceBookId
        // pehle set ho jaaye parent se
        Promise.resolve().then(() => {
            this.loadSectionData();
            this.getProductWithProductBundleRecord();
        });
    }
}

    connectedCallback() {
        this.documentClickHandler =
            this.handleDocumentClick.bind(this);

        document.addEventListener(
            'click',
            this.documentClickHandler
        );

        console.log(
            '[connectedCallback] recid:',
            this.recid
        );

        if (this.recordContextId) {
            this.loadSectionData();
        } else {
            this.sectionList = [];
        }

        this.getProductWithProductBundleRecord();
    }

    disconnectedCallback() {
        if (this.documentClickHandler) {
            document.removeEventListener(
                'click',
                this.documentClickHandler
            );
        }
    }

    async getProductWithProductBundleRecord() {
        this.loaded = true;
        Promise.all([
            getProductWithProductBundle({
                currencyCode: this.currency
            }),
            this.loadPriceBookOptions()
        ])
            .then(async ([result]) => {
                this.pbListRec = result || [];

                this.productBundleList =
                    this.getBundleOptionsForSelectedPriceBook();

                if (this.selectedPriceBookId) {
                    await this.loadPriceBookEntryOptions();
                }

                console.log(
                    'Product with Product Bundle : ',
                    JSON.stringify(result)
                );
            })
            .catch(error => {
                console.log('error=>' + error);

                this.showToast(
                    'Error',
                    error?.body?.message ||
                        'Failed to load bundle data',
                    'error'
                );
            })
            .finally(() => {
                this.loaded = false;
            });
    }

async loadPriceBookOptions() {
    // ✅ FIX: Sirf tab currency se filter karo jab lock active ho
    // (yani jab quote mein already products exist karte hain).
    // Agar lock nahi hai (sab delete ho gaya), toh saari pricebooks dikhao
    // taaki user dusri currency/pricebook switch kar sake.
    const effectiveCurrencyFilter = this.isPriceBookLocked
        ? (this.currency || '')
        : '';

    console.log('[loadPriceBookOptions] isPriceBookLocked =>', this.isPriceBookLocked, 'currencyFilter =>', effectiveCurrencyFilter);

    const result = await listPriceBooks({
        searchKey: '',
        currencyFilter: effectiveCurrencyFilter,
        activeOnly: true
    });

    this.priceBookOptions = (result || []).map(priceBook => ({
        value: priceBook.Id,
        label: priceBook.QuoteForce__Currency__c
            ? `${priceBook.Name} (${priceBook.QuoteForce__Currency__c})`
            : priceBook.Name
    }));

    if (this.savedPriceBookId) {
        const savedOptionExists = this.priceBookOptions.some(
            option => option.value === this.savedPriceBookId
        );
        if (savedOptionExists) {
            console.log('[loadPriceBookOptions] Using savedPriceBookId =>', this.savedPriceBookId);
            this.selectedPriceBookId = this.savedPriceBookId;
            return;
        }
    }

    const hasSelectedOption = this.priceBookOptions.some(
        option => option.value === this.selectedPriceBookId
    );

    if (!hasSelectedOption) {
        this.selectedPriceBookId = '';
        console.log('[loadPriceBookOptions] No match found, keeping blank');
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
            currencyFilter: this.currency || '',
            activeOnly: true
        });

        this.priceBookEntryOptions = (result || []).map(
            (entry) => ({
                value: entry.Id,

                label:
                    entry.QuoteForce__Product__r?.QuoteForce__Product_Code__c
                        ? `${entry.QuoteForce__Product__r.Name} (${entry.QuoteForce__Product__r.QuoteForce__Product_Code__c})`
                        : (
                            entry.QuoteForce__Product__r?.Name ||
                            entry.Name
                        ),

                productId:
                    entry.QuoteForce__Product__c,

                productName:
                    entry.QuoteForce__Product__r?.Name ||
                    entry.Name,

                productCode:
                    entry.QuoteForce__Product__r?.QuoteForce__Product_Code__c || '',

                unitPrice:
                    Number(
                        entry.QuoteForce__Unit_Price__c
                    ) || 0,

                searchText:
                    `${entry.QuoteForce__Product__r?.Name || ''} ${entry.QuoteForce__Product__r?.QuoteForce__Product_Code__c || ''} ${entry.Name || ''}`
                        .toLowerCase()
            })
        );

        this.refreshSectionProductOptions();
    }

    @api
    get currency() {
        return this._currency;
    }

set currency(value) {
    const normalizedValue = value || '';
    const hasChanged = this._currency !== normalizedValue;
    this._currency = normalizedValue;

    if (hasChanged) {
        console.log('[QuoteDetailCmp][currency setter] changed from', this._currency, 'to', normalizedValue);
        
        this.selectedBundleCurrency = '';
        
        if (!this.savedPriceBookId) {
            this.selectedPriceBookId = '';
        }
        
        this.selectedProductBundleId = '';
        this.priceBookOptions = [];
        this.priceBookEntryOptions = [];
        this.productBundleList = [];

        // ✅ FIX: recid ho ya na ho, options reload karo
        // Template mode me recid blank hota hai — tabhi pricebooks empty dikh rahi thi
        this.getProductWithProductBundleRecord();

        console.log('[QuoteDetailCmp][currency setter] getProductWithProductBundleRecord called, recid =>', this.recid);
    }
}  


   getBundlesForSelectedPriceBook() {
    if (!this.selectedPriceBookId) {
        return [];
    }

    return (this.pbListRec || []).filter(
        (bundle) =>
            this.bundleMatchesSelectedPriceBook(
                bundle,
                this.selectedPriceBookId
            )
    );
}

bundleMatchesSelectedPriceBook(
    bundle,
    selectedPriceBookId
) {
    if (!bundle || !selectedPriceBookId) {
        return false;
    }

    if (bundle.PriceBookId === selectedPriceBookId) {
        return true;
    }

    return (
        bundle.ProductLineItemWrapperList || []
    ).some(
        (item) =>
            item.PriceBookId === selectedPriceBookId
    );
}

getBundleOptionsForSelectedPriceBook() {
    return this.getBundlesForSelectedPriceBook().map(
        (bundle) => ({
            value: bundle.Id,
            label:
                `${bundle.Name} (${bundle.CurrencyType || 'No Currency'})`
        })
    );
}

getBundlePriceBookId(bundle) {
    return (
        bundle?.PriceBookId ||
        bundle?.ProductLineItemWrapperList
            ?.find(
                (item) =>
                    item.PriceBookId
            )
            ?.PriceBookId ||
        ''
    );
}

getBundlePriceBookName(bundle) {
    return bundle?.PriceBookName || 'Pricebook';
}
get isPriceBookLocked() {
    return this.sectionList && this.sectionList.length > 0;
}

get effectiveCurrency() {
    if (this.selectedBundleCurrency) return this.selectedBundleCurrency;

    // ✅ FIX: selectedPriceBookId se derived currency ko pehle check karo.
    // this.currency (parent prop) async update hota hai, toh pricebook select
    // karne ke turant baad woh stale ho sakta hai. Agar selected pricebook
    // se hum currency nikal sakte hain, usi ko trust karo — yeh sabse fresh hai.
    if (this.selectedPriceBookId) {
        const selectedPB = (this.priceBookOptions || []).find(
            opt => opt.value === this.selectedPriceBookId
        );
        const match = selectedPB?.label?.match(/\(([A-Z]{3})\)/);
        if (match) {
            console.log('[effectiveCurrency] Derived from selectedPriceBookId =>', match[1]);
            return match[1];
        }
    }

    if (this.currency) return this.currency;

    return '';
}

async handlePriceBookChange(event) {

    // ✅ FIX: User ne manually pricebook change kiya hai.
    // Ab savedPriceBookId purana ho chuka hai — usse override authority nahi deni.
    // savedPriceBookId ko naye selection se sync kar do taaki future
    // loadPriceBookOptions() calls isi naye ID ko "saved" maan ke respect karein,
    // purani wali ko wapas force na karein.
    this.savedPriceBookId = event.detail.value;

    this.selectedPriceBookId = event.detail.value;
    this.selectedProductBundleId = '';
    this.selectedBundleCurrency = '';
    this.selectedProdBundleName = '';
    this.alredyExistBundleModal = false;
    this.bundleSelectModel = false;

    this.getProductBundleList = [];
    this.getProductLineItemList = [];

    this.productBundleList =
        this.getBundleOptionsForSelectedPriceBook();

    await this.loadPriceBookEntryOptions();

    console.log('[QuoteDetailCmp][handlePriceBookChange] selectedPriceBookId =>', this.selectedPriceBookId);
    console.log('[QuoteDetailCmp][handlePriceBookChange] savedPriceBookId synced =>', this.savedPriceBookId);
    console.log('[QuoteDetailCmp][handlePriceBookChange] effectiveCurrency =>', this.effectiveCurrency);

    this.dispatchEvent(new CustomEvent('pricebookchange', {
        detail: {
            priceBookId: this.selectedPriceBookId,
            currency: this.effectiveCurrency
        }
    }));

    console.log('[QuoteDetailCmp][handlePriceBookChange] pricebookchange event dispatched');
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
    this.priceBookSearchTerm =
        event.detail?.value ??
        event.target.value ??
        '';

    this.isPriceBookDropdownOpen = true;
}

async handlePriceBookOptionSelect(event) {
    this.isPriceBookDropdownOpen = false;
    this.priceBookSearchTerm = '';

    await this.handlePriceBookChange({
        detail: {
            value:
                event.currentTarget.dataset.value
        }
    });
}

handleChangeProductBundle(event) {
      let pbId = event.target.value;

    console.log('pbId : ', pbId);

    this.alredyExistBundleModal = false;
    
    let selectedBundle =
        this.getBundlesForSelectedPriceBook()
            .find((b) => b.Id === pbId);

    this.selectedBundleCurrency =
        selectedBundle?.CurrencyType || '';

    console.log('currency => ', this.currency);
    console.log(
        'selectedBundleCurrency => ',
        this.selectedBundleCurrency
    );

    console.log(
        'selectedBundle : ',
        JSON.stringify(selectedBundle)
    );

    console.log(
        'selectedBundle.Currency : ',
        selectedBundle?.CurrencyType
    );

    console.log(
        'this.currency.Currency : ',
        this.currency
    );

    if (
        selectedBundle &&
        this.currency &&
        selectedBundle.CurrencyType !==
            this.currency
    ) {
        this.showCurrencyError = true;
        this.selectedProductBundleId = '';
        return;
    }

    this.selectedProductBundleId = pbId;
    this.dispatchEvent(
        new CustomEvent('bundlechange', {
            detail: {
                selectedBundleId: this.selectedProductBundleId
            }
        })
    );
    this.getProductBundleList = [];
    this.getProductLineItemList = [];

    this.pbListRec.forEach((element) => {
        console.log(
            'element : ',
            JSON.stringify(element)
        );

        if (
            this.selectedProductBundleId ===
            element.Id
        ) {
            this.selectedProdBundleName =
                element.Name;
        }
    });

    this.sectionList.forEach((secName) => {
        if (
            secName.title ===
            this.selectedProdBundleName
        ) {
            this.alredyExistBundleModal = true;
        }
    });

    if (this.alredyExistBundleModal == false) {
        this.bundleSelectModel = true;

        this.getBundlesForSelectedPriceBook()
            .forEach((element) => {
                if (
                    this.selectedProductBundleId ===
                    element.Id
                ) {
                    this.getProductBundleList.push(
                        element
                    );

                    this.selectedProdBundleName =
                        element.Name;

                    element.ProductLineItemWrapperList
                        .filter(
                            (item) =>
                                item.PriceBookId ===
                                this.selectedPriceBookId
                        )
                        .forEach((item) => {
                            console.log(
                                'item > : ',
                                JSON.stringify(item)
                            );

                            var productItem = {
                                'Id': item.Id,
                                'Name': item.Name,
                                'UnitOfMeasurement':
                                    item.UnitOfMeasurement,
                                'macProCheck': true,
                                'Qty': item.Qty,
                                'productName':
                                    item.productName,
                                'Price':
                                    item.unitCost,
                                'PriceBookEntryId':
                                    item.PriceBookEntryId,

                                'QuoteForce__Product_Bundle__c':
                                    this.selectedProductBundleId,
                            };

                            this.getProductLineItemList.push(
                                productItem
                            );

                            console.log(
                                'this.getProductLineItemList :',
                                JSON.stringify(
                                    this.getProductLineItemList
                                )
                            );
                        });
                }
            });
    }
}

    handleProductLineItemCheckboxChange(event) {
    var productId =
        event.currentTarget.dataset.id;

    this.getProductLineItemList.forEach(
        (element) => {
            if (productId == element.Id) {
                if (
                    element.macProCheck == false
                ) {
                    element.macProCheck = true;
                } else {
                    element.macProCheck = false;
                }
            }
        }
    );
}

closeModal() {
    this.bundleSelectModel = false;
    this.selectedProductBundleId = '';
}

alredyExistCloseModal() {
    this.alredyExistBundleModal = false;
}

handleCreateProuctListItem() {
    this.newProductLineItems();
}

async newProductLineItems() {
    this.bundleSelectModel = false;

    this.loaded = true;
    try {
        const selectedItems =
            this.getProductLineItemList.filter(
                (element) =>
                    element.macProCheck === true
            );

        if (!selectedItems.length) {
            this.showToast(
                'Error',
                'Select at least one bundle product.',
                'error'
            );

            return;
        }

        if (this.isDraftTemplateMode) {
            this.appendBundleSectionToUi(
                {
                    Id: this.generateTempId(
                        'section'
                    ),

                    Name:
                        this.selectedProdBundleName,

                    QuoteForce__Notes__c: ''
                },
                selectedItems,
                null
            );

            return;
        }

        const result =
            await createNewSection({
                quoteId:
                    this.recordContextId,

                sectionName:
                    this.selectedProdBundleName
            });

        const inserts = selectedItems.map(
            (element) => {
                const prod_sec_obj = {
                    'QuoteForce__Master_Template__c':
                        this.recordContextId,

                    'QuoteForce__Type__c':
                        'Master Template Product',

                    'QuoteForce__Product_Section__c':
                        result.Id,

                    'QuoteForce__Product__c':
                        element.productName,

                    'QuoteForce__Quantity__c':
                        Number(
                            element.Qty
                        ) || 1,

                    'QuoteForce__Price__c':
                        Number(
                            element.Price
                        ) || 0,

                    'QuoteForce__Price_Book_Entry__c':
                        element.PriceBookEntryId ||
                        null
                };

                return insertProdLineItms({
                    prod_lin_itms_obj:
                        prod_sec_obj
                });
            }
        );

        const insertedRows =
            await Promise.all(inserts);

        this.appendBundleSectionToUi(
            result,
            selectedItems,
            insertedRows
        );

        await this.loadSectionData();
    } catch (error) {
        console.error(
            '[addSection] Error:',
            error
        );

        this.showToast(
            'Error',
            this.normalizeError(
                error,
                'Failed to add bundle products'
            ),
            'error'
        );
    } finally {
        this.loaded = false;
    }
}

@api
async loadSectionData() {
    console.log(
        '[loadSectionData] Fetching data for quoteId:',
        this.recid
    );

    this.loaded = true;

    if (!this.recordContextId) {
        try {
            this.sectionList =
                this.sectionList || [];

            await this.loadPriceBookEntryOptions();

            this.recalculateTotals();
        } finally {
            this.loaded = false;
        }

        return;
    }


        // getSectionData({ quoteId: this.recid })
        //     .then(data => {
        //         console.log('[loadSectionData] Response:', JSON.stringify(data));
        //         this.sectionList = []; // Initialize empty list
        //         data.forEach(section => {
        //             const sectionObj = {
        //                 id: section.Id,
        //                 title: section.Name,
        //                 notes: section.Notes__c,
        //                 total: 0,
        //                 products: []
        //             };

        //             const items = section.QuoteLineItems__r || [];

        //             items.forEach(item => {
        //                 const quantity = item.Quantity__c || 0;
        //                 const price = item.Price__c || 0;

        //                 const line = {
        //                     id: item.Id,
        //                     prodId: item.Product__c,
        //                     productName: item.Product__r?.Name || '',
        //                     Quantity: quantity,
        //                     Price: price,
        //                     Tax: item.Tax__c,
        //                     MeasurementType: item.Measure_Unit__c,
        //                     lineTotal: (quantity * price).toFixed(2)
        //                 };

        //                 console.log('[Mapped Product]', line);
        //                 sectionObj.products.push(line);
        //             });

        //             this.sectionList.push(sectionObj);
        //         });

        //         this.recalculateTotals();
        //     })
        //     .catch(err => {
        //         console.error('[loadSectionData] Error:', err);
        //     });

getSectionData({ quoteId: this.recordContextId })
    .then(async data => {
        console.log(
            '[loadSectionData] Response:',
            JSON.stringify(data)
        );

        this.sectionList = [];

        data.forEach(section => {
            const sectionObj = {
                id: section.Id,

                title: section.Name,

                notes:
                    section.QuoteForce__Notes__c,

                total: 0,

                products: []
            };

            const items =
                section.QuoteForce__QuoteLineItems__r || [];

            items.forEach(item => {
                const line =
                    this.buildSectionProductRow({
                        id: item.Id,

                        prodId:
                            item.QuoteForce__Product__c,

                        productName:
                            item.QuoteForce__Price_Book_Entry__r
                                ?.QuoteForce__Product__r
                                ?.Name ||
                            item.QuoteForce__Product__r
                                ?.Name ||
                            '',

                        productCode:
                            item.QuoteForce__Price_Book_Entry__r
                                ?.QuoteForce__Product__r
                                ?.QuoteForce__Product_Code__c ||
                            item.QuoteForce__Product__r
                                ?.QuoteForce__Product_Code__c ||
                            '',

                        priceBookEntryId:
                            item.QuoteForce__Price_Book_Entry__c,

                        priceBookId:
                            item.QuoteForce__Price_Book_Entry__r
                                ?.QuoteForce__Price_Book__c,

                        Quantity:
                            Number(
                                item.QuoteForce__Quantity__c
                            ) || 0,

                        Price:
                            Number(
                                item.QuoteForce__Price__c
                            ) || 0,

                        Tax:
                            item.QuoteForce__Tax__c,

                        MeasurementType:
                            item.QuoteForce__Measure_Unit__c
                    });

                console.log(
                    '[Mapped Product]',
                    line
                );

                sectionObj.products.push(line);
            });

            this.sectionList.push(sectionObj);
        });

        // ✅ FIX: pehle priceBookOptions load karo
        await this.loadPriceBookOptions();

        // ✅ PHIR infer karo — ab priceBookOptions populated hogi
        await this.ensureSelectedPriceBookLoaded();

        // ✅ PHIR entries load karo
        await this.loadPriceBookEntryOptions();

        this.recalculateTotals();
    })
    .catch(err => {
        console.error(
            '[loadSectionData] Error:',
            err
        );

        this.showToast(
            'Error',
            this.normalizeError(
                err,
                'Failed to load sections'
            ),
            'error'
        );
    })
    .finally(() => {
        this.loaded = false;
    });
}

    // handleInputValueChange(event) {
    //     const sectionId = event.currentTarget.dataset.sectionid;
    //     const productId = event.currentTarget.dataset.id;
    //     const field = event.target.name;
    //     const value = event.target.value;

    //     console.log(`[InputChange] SectionID: ${sectionId}, ProductID: ${productId}, Field: ${field}, Value: ${value}`);

    //     const section = this.sectionList.find(sec => sec.id === sectionId);
    //     const product = section?.products.find(p => p.id === productId);

    //     if (product) {
    //         if (field === 'prodId') {
    //             product.prodId = value;
    //             console.log(`[Updated Product] prodId = ${value}`);
    //         } else {
    //             product[field] = field === 'Quantity' || field === 'Price' || field === 'Tax' ? parseFloat(value) || 0 : value;
    //         }

    //         // Recalculate line total (if price/quantity changed)
    //         product.lineTotal = (product.Quantity || 0) * (product.Price || 0);

    //         console.log(`[Updated Product Object]`, JSON.stringify(product));
    //     }

    //     this.recalculateTotals();
    // }


    recalculateTotals() {
        this.sectionList = (this.sectionList || []).map(section => ({
            ...section,
            total: section.products.reduce((sum, p) => sum + Number(p.lineTotal || 0), 0)
        }));
        console.log('[Recalculated Totals]', JSON.stringify(this.sectionList));
    }

    handleSectionChange(event) {
        const sectionId = event.currentTarget.dataset.id;
        const value = event.target.value;
        const field = event.target.name;

        console.log(`[SectionChange] SectionID: ${sectionId}, Field: ${field}, Value: ${value}`);

        const section = this.sectionList.find(s => s.id === sectionId);
        if (section) {
            section[field === 'productBundle' ? 'title' : 'notes'] = value;
            console.log('[Updated Section]', section);
        }
    }

    // addRow(event) {
    //     const sectionId = event.currentTarget.dataset.id;
    //     const section = this.sectionList.find(s => s.id === sectionId);

    //     if (section) {
    //         const tempId = 'temp_' + Date.now();
    //         const newRow = {
    //             id: tempId,
    //             prodId: null,
    //             productName: '',
    //             Quantity: 1,
    //             Price: 0,
    //             Tax: 0,
    //             MeasurementType: 'EA',
    //             lineTotal: 0
    //         };
    //         section.products.push(newRow);
    //         console.log('[Row Added]', newRow);
    //     }
    // }

 /*   async deleteRow(event) {
        const prodId = event.currentTarget.dataset.id;
        console.log('[DeleteRow] Product ID:', prodId);

        for (let section of this.sectionList) {
            const index = section.products.findIndex(p => p.id === prodId);
            if (index !== -1) {
                if (prodId && !prodId.startsWith('temp_')) {
                    console.log('[DeleteRow] Deleting from server...');
                    await deleteQuoteLineItem({ itemId: prodId });
                }
                console.log('[DeleteRow] Removing from UI...');
                section.products.splice(index, 1);
                break;
            }
        }

        this.recalculateTotals();
    }*/

 @track showDeleteItemModal = false;
selectedDeleteItemId = null;

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

confirmDeleteItem() {
    const prodId = this.selectedDeleteItemId;
    this.showDeleteItemModal = false;
    this.selectedDeleteItemId = null;

    if (this.isTemporaryId(prodId)) {
        this.sectionList = this.sectionList.map(section => ({
            ...section,
            products: section.products.filter(p => p.id !== prodId)
        }));
        this.recalculateTotals();
        return;
    }

    deleteQuoteLineItem({ itemId: prodId })
        .then(() => {
            this.sectionList = this.sectionList.map(section => ({
                ...section,
                products: section.products.filter(p => p.id !== prodId)
            }));
            this.sectionList = [...this.sectionList];
            this.recalculateTotals();
        })
        .catch(error => {
            console.error('[DeleteRow] Failed:', error);
        });
}
async deleteSection(event) {
    const sectionId = event.currentTarget.dataset.id;
    const secIndex = event.currentTarget.dataset.index;

    console.log(`[DeleteSection] SectionID: ${sectionId}, Index: ${secIndex}`);

    if (this.isTemporaryId(sectionId)) {
        this.sectionList.splice(secIndex, 1);
        this.sectionList = [...this.sectionList];
        return;
    }

    if (sectionId) {
        await deleteSectionRecord({ sectionId });

        console.log('[DeleteSection] Deleted from server');
    }

    this.sectionList.splice(secIndex, 1);

    console.log('[DeleteSection] Removed from UI');
}

async handleSaveRecords() {
    try {
        this.loadSectionData();

        alert('Records saved successfully!');
    } catch (error) {
        console.error('[handleSaveRecords] Error:', error);
    }
}

DragStart(event) {
    this.dragStartIndex = event.currentTarget.title;

    console.log('[DragStart] index:', this.dragStartIndex);
}

DragOver(event) {
    event.preventDefault();
}

Drop(event) {
    const endIndex = event.currentTarget.title;

    console.log(`[Drop] DragFrom: ${this.dragStartIndex}, DropTo: ${endIndex}`);

    const draggedItem =
        this.sectionList[parseInt(this.dragStartIndex)];

    this.sectionList.splice(this.dragStartIndex, 1);

    this.sectionList.splice(endIndex, 0, draggedItem);

    console.log(
        '[Drop] New section order:',
        this.sectionList.map(s => s.title)
    );

    this.dragStartIndex = null;
}

addSection() {
    const sectionName =
        'Section ' + (this.sectionList.length + 1);

    console.log(
        '[addSection] Creating section:',
        sectionName
    );

    if (this.isDraftTemplateMode) {
        const tempSectionId =
            this.generateTempId('section');

        this.sectionList = [
            ...(this.sectionList || []),
            {
                id: tempSectionId,
                title: sectionName,
                notes: '',
                products: [],
                total: 0
            }
        ];

        this.addDraftRowToSection(tempSectionId);

        return;
    }

      createNewSection({ quoteId: this.recordContextId, sectionName })
    .then((result) => {
        this.sectionList = [
            ...(this.sectionList || []),
            {
                id: result.Id,
                title: result.Name,
                notes: '',
                products: [],
                total: 0
            }
        ];

        console.log('[addSection] Created:', result);

        return this.addRowToSection(result.Id);
    })
    .catch(error => {
        console.error('[addSection] Error:', error);

        this.showToast(
            'Error',
            this.normalizeError(error, 'Failed to add section'),
            'error'
        );
    });
}

addRowSectionProduct(event) {
    this.addRowToSection(
        event.currentTarget.dataset.id
    );
}

addRowToSection(sectionId) {
    if (this.isDraftTemplateMode) {
        this.addDraftRowToSection(sectionId);

        return Promise.resolve();
    }

    const section =
        this.sectionList.find(
            current => current.id === sectionId
        );

    return createNewSectionProduct({
        quoteId: this.recordContextId,
        sectionId
    })
        .then((result) => {
            if (section) {
                const newRow =
                    this.buildSectionProductRow({
                        id: result.Id,

                        prodId: null,

                        productName: '',

                        productCode: '',

                        priceBookEntryId: '',

                        priceBookId:
                            this.selectedPriceBookId,

                        Quantity: 1,

                        Price: 0
                    });

                this.sectionList =
                    (this.sectionList || []).map(
                        current => (
                            current.id === sectionId
                                ? {
                                    ...current,

                                    products: [
                                        ...(current.products || []),
                                        newRow
                                    ]
                                }
                                : current
                        )
                    );

                console.log('[Row Added]', newRow);

                this.recalculateTotals();
            }
        })
        .catch(error => {
            console.error(
                '[addSection] Error:',
                error
            );

            this.showToast(
                'Error',
                this.normalizeError(
                    error,
                    'Failed to add product row'
                ),
                'error'
            );
        });
}

addDraftRowToSection(sectionId) {
    const newRow =
        this.buildSectionProductRow({
            id: this.generateTempId('row'),

            prodId: null,

            productName: '',

            productCode: '',

            priceBookEntryId: '',

            priceBookId:
                this.selectedPriceBookId,

            Quantity: 1,

            Price: 0
        });

    this.sectionList =
        (this.sectionList || []).map(
            current => (
                current.id === sectionId
                    ? {
                        ...current,

                        products: [
                            ...(current.products || []),
                            newRow
                        ]
                    }
                    : current
            )
        );

    this.recalculateTotals();
}

handleSectionTitle(event) {
    const sectionId =
        event.currentTarget.dataset.id;

    const value = event.target.value;

    this.sectionList =
        (this.sectionList || []).map(
            section => (
                section.id === sectionId
                    ? {
                        ...section,
                        title: value
                    }
                    : section
            )
        );

    var prod_sec_obj = {
        'Id': sectionId,
        'Name': value
    };

    if (!this.isTemporaryId(sectionId)) {
        this.updateProductSection(
            prod_sec_obj
        );
    }
}

handleSectionNote(event) {
    const sectionId =
        event.currentTarget.dataset.id;

    const value = event.target.value;

    this.sectionList =
        (this.sectionList || []).map(
            section => (
                section.id === sectionId
                    ? {
                        ...section,
                        notes: value
                    }
                    : section
            )
        );

    var prod_sec_obj = {
        'Id': sectionId,
        'QuoteForce__Notes__c': value
    };

    if (!this.isTemporaryId(sectionId)) {
        this.updateProductSection(
            prod_sec_obj
        );
    }

        // const field = event.target.name;

        // console.log(`[SectionChange] SectionID: ${sectionId}, Field: ${field}, Value: ${value}`);

        // const section = this.sectionList.find(s => s.id === sectionId);
        // if (section) {
        //     section[field === 'productBundle' ? 'title' : 'notes'] = value;
        //     console.log('[Updated Section]', section);
        // }
    }

    buildSectionProductRow(row) {
    const quantity = Number(row.Quantity) || 0;
    const price = Number(row.Price) || 0;

    const normalizedSearchTerm =
        (row.entrySearchTerm || '')
            .trim()
            .toLowerCase();

    const filteredEntryOptions =
        normalizedSearchTerm
            ? (this.priceBookEntryOptions || []).filter(
                (option) =>
                    option.searchText.includes(
                        normalizedSearchTerm
                    )
            )
            : [...(this.priceBookEntryOptions || [])];

    return {
        id: row.id,
        prodId: row.prodId || '',
        productName: row.productName || '',
        productCode: row.productCode || '',
        priceBookEntryId: row.priceBookEntryId || '',
        priceBookId:
            row.priceBookId ||
            this.selectedPriceBookId ||
            '',

        priceBookEntryLabel:
            row.priceBookEntryLabel ||
            this.formatPriceBookEntryLabel(
                row.productName,
                row.productCode
            ),

        entrySearchTerm:
            row.entrySearchTerm || '',

        isEntryDropdownOpen:
            row.isEntryDropdownOpen || false,

        filteredEntryOptions,

        hasFilteredEntryOptions:
            filteredEntryOptions.length > 0,

        Quantity: quantity,
        Price: price,

        Tax: row.Tax,

        MeasurementType:
            row.MeasurementType,

        lineTotal:
            quantity * price
    };
}

refreshSectionProductOptions() {
    this.sectionList =
        (this.sectionList || []).map(
            section => ({
                ...section,

                products:
                    (section.products || []).map(
                        product =>
                            this.buildSectionProductRow(
                                product
                            )
                    )
            })
        );
}

inferSelectedPriceBookIdFromSections() {
    for (const section of this.sectionList || []) {
        const matchingProduct =
            (section.products || []).find(
                (product) =>
                    product.priceBookId
            );

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

    const resolvedPriceBookId =
        this.inferSelectedPriceBookIdFromSections();

    if (resolvedPriceBookId) {
        this.selectedPriceBookId = resolvedPriceBookId;
        this.productBundleList = this.getBundleOptionsForSelectedPriceBook();
        
       
        this.sectionList = [...this.sectionList];
    }
}

formatPriceBookEntryLabel(
    productName,
    productCode
) {
    if (productName && productCode) {
        return `${productName} (${productCode})`;
    }

    return productName ||
        'Select Price Book Entry';
}

closeSectionEntryDropdowns() {
    this.sectionList =
        (this.sectionList || []).map(
            section => ({
                ...section,

                products:
                    (section.products || []).map(
                        product => ({
                            ...product,

                            isEntryDropdownOpen:
                                false
                        })
                    )
            })
        );
}

openSectionEntryDropdown(event) {
    event.stopPropagation();

    if (
        this.isSectionEntryPickerDisabled
    ) {
        return;
    }

    const rowId =
        event.currentTarget.dataset.id;

    const sectionId =
        event.currentTarget.dataset.sectionid;

    this.sectionList =
        (this.sectionList || []).map(
            section => ({
                ...section,

                products:
                    (section.products || []).map(
                        product => ({
                            ...product,

                            isEntryDropdownOpen:
                                section.id ===
                                    sectionId &&
                                product.id === rowId
                        })
                    )
            })
        );
}

handleSectionEntrySearch(event) {
    const rowId =
        event.target.dataset.id;

    const sectionId =
        event.target.dataset.sectionid;

    const searchTerm =
        event.detail?.value ??
        event.target.value ??
        '';

    this.sectionList =
        (this.sectionList || []).map(
            section => ({
                ...section,

                products:
                    (section.products || []).map(
                        product => (
                            section.id ===
                                sectionId &&
                            product.id === rowId
                                ? this.buildSectionProductRow({
                                    ...product,

                                    entrySearchTerm:
                                        searchTerm,

                                    isEntryDropdownOpen:
                                        true
                                })
                                : product
                        )
                    )
            })
        );
}

handleSectionEntryOptionSelect(event) {
    const rowId =
        event.currentTarget.dataset.id;

    const sectionId =
        event.currentTarget.dataset.sectionid;

    const entryId =
        event.currentTarget.dataset.value;

    const selectedEntry =
        (this.priceBookEntryOptions || [])
            .find(
                (option) =>
                    option.value === entryId
            );

    if (!selectedEntry) {
        return;
    }

    const existingSection =
        (this.sectionList || []).find(
            (section) =>
                section.id === sectionId
        );

    const existingProduct =
        existingSection?.products?.find(
            (product) =>
                product.id === rowId
        );

    const quantity =
        Number(existingProduct?.Quantity) > 0
            ? Number(
                existingProduct.Quantity
            )
            : 1;

    const price =
        Number(
            selectedEntry.unitPrice || 0
        );

    this.updateProductSectionLineItms({
        Id: rowId,

        QuoteForce__Product__c:
            selectedEntry.productId,

        QuoteForce__Price_Book_Entry__c:
            entryId,

        QuoteForce__Price__c:
            price,

        QuoteForce__Quantity__c:
            quantity
    });

    this.updateLocalProduct(
        sectionId,
        rowId,
        {
            prodId:
                selectedEntry.productId,

            productName:
                selectedEntry.productName,

            productCode:
                selectedEntry.productCode,

            priceBookEntryId:
                entryId,

            priceBookId:
                this.selectedPriceBookId,

            priceBookEntryLabel:
                selectedEntry.label,

            entrySearchTerm: '',

            isEntryDropdownOpen:
                false,

            Quantity: quantity,

            Price: price,

            lineTotal:
                quantity * price
        }
    );
}

handleProduct(event) {
    const productId =
        event.currentTarget.dataset.id;

    const sectionid =
        event.currentTarget.dataset.sectionid;

    const value =
        event.target.value;

    if (value != null) {
        getProductDetailsForContext({
            productId: value,
            quoteId: this.recordContextId,
            invoiceId: null
        })
            .then(data => {
                let dfPrice =
                    data.defaultPrice;

                let dfQty =
                    data.defaultQuantity || 1;

                var prod_lin_itms_obj = {
                    'Id': productId,

                    'QuoteForce__Product__c':
                        value,

                    'QuoteForce__Price__c':
                        dfPrice,

                    'QuoteForce__Quantity__c':
                        1
                };

                this.updateProductSectionLineItms(
                    prod_lin_itms_obj
                );

                const section =
                    this.sectionList.find(
                        sec =>
                            sec.id ===
                            sectionid
                    );

                const product =
                    section?.products.find(
                        p =>
                            p.id ===
                            productId
                    );

                if (product) {
                    product.prodId =
                        value;

                    product.Quantity =
                        dfQty;

                    product.Price =
                        dfPrice;

                    let total =
                        (product.Quantity || 0) *
                        (product.Price || 0);

                    console.log(
                        `[Updated Product] prodId = ${value}`
                    );

                    product.lineTotal =
                        total.toFixed(2);

                    console.log(
                        `[Updated Product Object]`,
                        JSON.stringify(product)
                    );
                }

                this.recalculateTotals();
            })
            .catch(error =>
                console.error(
                    'Error fetching product details:',
                    error
                )
            );
    } else {
        var prod_lin_itms_obj = {
            'Id': productId,

            'QuoteForce__Quantity__c':
                1,

            'QuoteForce__Price__c':
                0,

            'QuoteForce__Product__c':
                ''
        };

        this.updateProductSectionLineItms(
            prod_lin_itms_obj
        );

        const section =
            this.sectionList.find(
                sec => sec.id === sectionid
            );

        const product =
            section?.products.find(
                p => p.id === productId
            );

        if (product) {
            product.prodId = value;

            product.Quantity = 0;

            product.Price = 0;

            let total =
                (product.Quantity || 0) *
                (product.Price || 0);

            product.lineTotal =
                total.toFixed(2);
        }
    }
}

    handleProductQuantity(event) {
    const productId = event.currentTarget.dataset.id;
    const value = event.target.value;
    const sectionid = event.currentTarget.dataset.sectionid;

    var prod_lin_itms_obj = {
        'Id': productId,
        'QuoteForce__Quantity__c': value
    };

    this.updateProductSectionLineItms(prod_lin_itms_obj);

    const section = this.sectionList.find(sec => sec.id === sectionid);
    const product = section?.products.find(p => p.id === productId);

    if (product) {
        product.Quantity = value;

        let total =
            (product.Quantity || 0) *
            (product.Price || 0);

        product.lineTotal = total.toFixed(2);

        console.log(
            `[Updated Product Object]`,
            JSON.stringify(product)
        );
    }

    this.recalculateTotals();
}

handleProductPrice(event) {
    const productId = event.currentTarget.dataset.id;
    const value = event.target.value;
    const sectionid = event.currentTarget.dataset.sectionid;

    var prod_lin_itms_obj = {
        'Id': productId,
        'QuoteForce__Price__c': value
    };

    this.updateProductSectionLineItms(prod_lin_itms_obj);

    const section = this.sectionList.find(sec => sec.id === sectionid);
    const product = section?.products.find(p => p.id === productId);

    if (product) {
        product.Price = value;

        let total =
            (product.Quantity || 0) *
            (product.Price || 0);

        product.lineTotal = total.toFixed(2);

        console.log(
            `[Updated Product Object]`,
            JSON.stringify(product)
        );
    }

    this.recalculateTotals();
}

updateProductSection(Object) {
    if (
        !Object?.Id ||
        this.isTemporaryId(Object.Id)
    ) {
        return;
    }

    updateProdSection({
        prod_sec_obj: Object
    })
        .then((result) => {
            console.log(
                '[addSection] Created:',
                result
            );
        })
        .catch(error => {
            console.error(
                '[addSection] Error:',
                error
            );
        });
}

updateProductSectionLineItms(Object) {
    if (
        !Object?.Id ||
        this.isTemporaryId(Object.Id)
    ) {
        return;
    }

    updateProdLineItms({
        prod_lin_itms_obj: Object
    })
        .then((result) => {
            console.log(
                'update',
                result
            );
        })
        .catch(error => {
            console.error(
                '[update] Error:',
                error
            );
        });
}

updateLocalProduct(
    sectionId,
    rowId,
    update
) {
    this.sectionList =
        (this.sectionList || []).map(
            section => {
                if (
                    section.id !== sectionId
                ) {
                    return section;
                }

                return {
                    ...section,

                    products:
                        (section.products || []).map(
                            product => {
                                if (
                                    product.id !== rowId
                                ) {
                                    return product;
                                }

                                const patch =
                                    typeof update === 'function'
                                        ? update(product)
                                        : update;

                                return this.buildSectionProductRow({
                                    ...product,
                                    ...patch
                                });
                            }
                        )
                };
            }
        );

    this.recalculateTotals();
}

appendBundleSectionToUi(
    sectionRecord,
    selectedItems,
    insertedRows
) {
    const products =
        (selectedItems || []).map(
            (item, index) =>
                this.buildSectionProductRow({
                    id:
                        insertedRows?.[index]?.Id ||
                        this.generateTempId(
                            'row'
                        ),

                    prodId:
                        item.productName,

                    productName:
                        item.Name,

                    productCode: '',

                    priceBookEntryId:
                        item.PriceBookEntryId || '',

                    priceBookId:
                        this.selectedPriceBookId,

                    priceBookEntryLabel:
                        this.formatPriceBookEntryLabel(
                            item.Name,
                            ''
                        ),

                    Quantity:
                        Number(item.Qty) || 1,

                    Price:
                        Number(item.Price) || 0,

                    MeasurementType:
                        item.UnitOfMeasurement
                })
        );

    const newSection = {
        id:
            sectionRecord.Id ||
            this.generateTempId(
                'section'
            ),

        title:
            sectionRecord.Name,

        notes:
            sectionRecord.QuoteForce__Notes__c || '',

        total:
            products.reduce(
                (sum, product) =>
                    sum +
                    Number(
                        product.lineTotal || 0
                    ),
                0
            ),

        products
    };

    this.sectionList = [
        ...this.sectionList,
        newSection
    ];

    this.recalculateTotals();
}

@track showCurrencyError = false;

closeCurrencyModal() {
    this.showCurrencyError = false;
}

get bundleSelectionHint() {
    if (!this.selectedPriceBookId) {
        return 'Select a pricebook to view bundles.';
    }

    if (!this.productBundleList.length) {
        return 'No bundles are available for the selected pricebook.';
    }

    if (
        this.currency &&
        this.selectedBundleCurrency
        
    ) {
        return `Only bundles in ${this.currency} can be added. Selected bundle is ${this.selectedBundleCurrency}.`;
        
    }

    if (this.currency) {
        return `Only bundles in ${this.currency} can be added.`;
    }

    return 'Select a bundle to view its currency.';
}

get isBundleSelectionDisabled() {
    return (
        !this.selectedPriceBookId ||
        !this.productBundleList.length
    );
}

get isSectionEntryPickerDisabled() {
    return (
        !this.selectedPriceBookId ||
        !this.priceBookEntryOptions.length
    );
}

get filteredPriceBookOptions() {
    const normalizedSearchTerm =
        (this.priceBookSearchTerm || '')
            .trim()
            .toLowerCase();

    if (!normalizedSearchTerm) {
        return this.priceBookOptions || [];
    }

    return (
        this.priceBookOptions || []
    ).filter(
        (option) =>
            (option.label || '')
                .toLowerCase()
                .includes(
                    normalizedSearchTerm
                )
    );
}

get hasFilteredPriceBookOptions() {
    return (
        this.filteredPriceBookOptions
            .length > 0
    );
}

get selectedPriceBookLabel() {
    const selectedPriceBook =
        (this.priceBookOptions || [])
            .find(
                (option) =>
                    option.value ===
                    this.selectedPriceBookId
            );

    return (
        selectedPriceBook?.label ||
        'Select Pricebook'
    );
}

get priceBookComboboxClass() {
    return `custom-combobox__control${this.isPriceBookDropdownOpen ? ' custom-combobox__control--open' : ''}`;
}

get currencyMismatchMessage() {
    if (
        this.currency &&
        this.selectedBundleCurrency
    ) {
        return `This bundle uses ${this.selectedBundleCurrency}, but the current quote uses ${this.currency}.`;
        
    }

    return 'This bundle does not belong to the selected currency.';
}

get currencyBadgeLabel() {
    const cur = this.effectiveCurrency;
    return cur
        ? `Current Quote Currency: ${cur}`
        : 'Current Quote Currency: Not Set';
}
get currencySymbol() {
    const symbols = {
        'EUR': '€', 'USD': '$',
        'GBP': '£', 'INR': '₹', 'AED': 'د.إ'
    };
    return symbols[this.effectiveCurrency] || this.effectiveCurrency;
}  

get selectedBundleCurrencyLabel() {
    return this.selectedBundleCurrency
        ? `Selected Bundle Currency: ${this.selectedBundleCurrency}`
        : '';
        console.log('currency => ', this.currency);
console.log('selectedBundleCurrency => ', this.selectedBundleCurrency);
}

showToast(title, message, variant) {
    this.dispatchEvent(
        new ShowToastEvent({
            title,
            message,
            variant
        })
    );
}

generateTempId(prefix) {
    this.tempIdCounter += 1;

    return `temp_${prefix}_${Date.now()}_${this.tempIdCounter}`;
}

isTemporaryId(value) {
    return (
        typeof value === 'string' &&
        value.startsWith('temp_')
    );
}


@api
async persistDraftSections(templateId) {
    console.log('persistDraftSections called, templateId =>', templateId);
    console.log('sectionList =>', JSON.stringify(this.sectionList));

    const draftSections = (this.sectionList || []).filter(
        (section) => this.isTemporaryId(section.id)
    );

    console.log('draftSections =>', JSON.stringify(draftSections));

    if (!templateId || !draftSections.length) {
        console.log('EARLY RETURN — templateId:', templateId, 'draftSections.length:', draftSections.length);
        return;
    }

    this.loaded = true;
    try {
    for (const draftSection of draftSections) {
        try {
            console.log('Creating section for templateId =>', templateId);

            const createdSection = await createNewSection({
                quoteId: templateId,
                sectionName: draftSection.title || 'Section'
            });

            console.log('createdSection =>', JSON.stringify(createdSection));

            if (draftSection.notes) {
                await updateProdSection({
                    prod_sec_obj: {
                        Id: createdSection.Id,
                        QuoteForce__Notes__c: draftSection.notes
                    }
                });
            }

            const validProducts = (draftSection.products || []).filter(
                (product) => product.prodId
            );

            console.log('validProducts =>', JSON.stringify(validProducts.map(p => ({
                prodId: p.prodId,
                priceBookEntryId: p.priceBookEntryId,
                Quantity: p.Quantity,
                Price: p.Price
            }))));

            for (const product of validProducts) {
                try {
                    const insertResult = await insertProdLineItms({
                        prod_lin_itms_obj: {
                            QuoteForce__Master_Template__c: templateId,
                            QuoteForce__Type__c: 'Master Template Product',
                            QuoteForce__Product_Section__c: createdSection.Id,
                            QuoteForce__Product__c: product.prodId,
                            QuoteForce__Quantity__c: Number(product.Quantity) || 1,
                            QuoteForce__Price__c: Number(product.Price) || 0,
                            QuoteForce__Price_Book_Entry__c: product.priceBookEntryId || null
                        }
                    });
                    console.log('insertProdLineItms SUCCESS =>', JSON.stringify(insertResult));
                } catch(err) {
                    console.error('insertProdLineItms FAILED =>', JSON.stringify(err));
                }
            }

        } catch(err) {
            console.error('createNewSection FAILED =>', JSON.stringify(err));
        }
    }
    } finally {
        this.loaded = false;
    }
}

normalizeError(
    error,
    fallbackMessage
) {
    if (Array.isArray(error?.body)) {
        return (
            error.body
                .map(
                    (entry) =>
                        entry.message
                )
                .filter(Boolean)
                .join(', ') ||
            fallbackMessage
        );
    }

    return (
        error?.body?.message ||
        error?.message ||
        fallbackMessage
    );
}

}