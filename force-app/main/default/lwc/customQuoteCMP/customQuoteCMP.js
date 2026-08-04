import { LightningElement, track, api, wire } from 'lwc';
import CreateMasterLayout from '@salesforce/apex/createMasterTemplateRecord.CreateMasterLayout';
import CreateCustomPage from '@salesforce/apex/createMasterTemplateRecord.CreateCustomPage';
import updateCustomPage from '@salesforce/apex/createMasterTemplateRecord.updateCustomPage';
import uploadBulkFiles from '@salesforce/apex/createMasterTemplateRecord.uploadBulkFiles';
import getLayoutRecord from '@salesforce/apex/createMasterTemplateRecord.getLayoutRecord';
import updateQuoteDetails from '@salesforce/apex/createMasterTemplateRecord.updateQuoteDetails';
import getCustomPage from '@salesforce/apex/createMasterTemplateRecord.getCustomPage';
import getCustomPageQuote from '@salesforce/apex/createMasterTemplateRecord.getCustomPageQuote';
import UpdateMasterLayout from '@salesforce/apex/createMasterTemplateRecord.UpdateMasterLayout';
import deleteFile from '@salesforce/apex/createMasterTemplateRecord.deleteFile';
import deleteLayoutPage from '@salesforce/apex/createMasterTemplateRecord.deleteLayoutPage';
import deleteQuoteFile from '@salesforce/apex/createMasterTemplateRecord.deleteQuoteFile';
import uploadFile from '@salesforce/apex/createMasterTemplateRecord.uploadFile';
import getLayouts from '@salesforce/apex/createMasterTemplateRecord.getLayouts';
import getQuoteDetails from '@salesforce/apex/createMasterTemplateRecord.getQuoteDetails';
import attachDocsToQuote from '@salesforce/apex/createMasterTemplateRecord.attachDocsToQuote';
import getQuoteDocumentLinks from '@salesforce/apex/createMasterTemplateRecord.getQuoteDocumentLinks';
import SectionDeleteCancel from '@salesforce/apex/ProductConfigurationController.SectionDeleteCancel';
import getAdminConfig from '@salesforce/apex/AdminSettingController.getAdminConfig';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class CustomQuoteCMP extends LightningElement {

    @track uploadedDocUrls = {
        primaryDocUrl: undefined,
        secondaryDocUrl: undefined,
        warrantyDocUrl: undefined,
        termConditionDocUrl: undefined,
        customPageDocUrl: undefined
    }

    @track uploadedDocumentList = [];

    @track isDocAvailable = {
        primaryImageAvl: false,
        secondaryImageAvl: false,
        warrantyImageAvl: false,
        termConditionImageAvl: false,
        customPageImageAvl: false
    }

    @track contentDocId = {
        primaryDocId: undefined,
        secondaryDocId: undefined,
        warrantyDocId: undefined,
        termConDocId: undefined,
        customPageDocId: undefined
    }

    @track ElementList = [
        { Id: 1, Name: 'Title', label: 'Title', selected: true, editMode: false, toggle: false },
        { Id: 2, Name: 'Letter from the owner', label: 'Letter from the owner', selected: false, editMode: false, toggle: false },
        { Id: 3, Name: 'Quote Details', label: 'Quote Details', selected: false, editMode: false, toggle: false },
        { Id: 4, Name: 'Warranty', label: 'Warranty', selected: false, editMode: false, toggle: false },
        { Id: 5, Name: 'Terms and Conditions', label: 'Terms and Conditions', selected: false, editMode: false, toggle: false }
    ];

    editCustomPageName = false;
    titleViewPageModel = false;
    LetterFromTheOwnerModel = false;
    QuoteDetailModel = false;
    clickCount = 0;
    fileDataPrimary;
    @track currentSelectedCustomPage = {};
    currentCustomPageRecordId = '';
    fileTypes = ['.jpg', '.png', '.jpeg'];

    @track dataPageName = 'Title';
    @api templateId;
    @track currencyType = '';
    @api recordId;
    @api quoteId;
    @api mode;
    @api isFromQuote = false;
    @track cDate;
    @track pageLabel = '';
    @track loaded = false;
    @track titlePageSelected = true;
    @track latterFormTheOwnerPageSelected = false;
    @track quoteDetailPageSelected = false;
    @track WarrantyPageSelected = false;
    @track TermsAndConditionPageSelected = false;
    @track customePage = false;
    @track customPageRichTextValue = '';
    @track customPageDocUrl = undefined;
    @track customPageDocId = undefined;
    @track customPageImageAvl = false;
    @track customPageEditorVisible = true;
    @track fieldValues = {};
    @track letterForm = '';
    @track zipCode = '';
    @track stateProvince = '';
    @track city = '';
    @track streetAddress = '';
    @track lastName = '';
    @track firstName = '';
    @track CreatedDate = '';
    @track secondaryImage = '';
    @track PrimaryUploadedFilesUrl = [];
    @track reportType;
    @track contactId;
    @track FirstName;
    @track LastName;
    @track Street_Address;
    @track City;
    @track State;
    @track Zip;
    @track wiredLayoutsResult;
    @track editBoolPages = false;
    @track valLetterFromTheOwner = 'letter from the owner';
    @track valTitle = 'Title';
    @track myVal = 'Initial rich text content';
    @track valQuoteDetails = 'QuoteDetails';
    @track InspectionImagesList = [];
    @track isInsert = false;
    @track priceBookId = '';
    @track selectedBundleIdtest = '';
    isImageDeleteModalOpen = false;
    pendingDeleteDocType = null;
    pendingDeleteContentId = null;

    // ✅ FIX: Getter to show/hide Quote Details without destroying the component
    get quoteDetailStyle() {
        return this.quoteDetailPageSelected ? '' : 'display: none;';
    }
    @track _effectiveRecId = '';

get effectiveRecId() {
    return this._effectiveRecId;
}
handlePriceBookChangeFromChild(event) {
    console.log('[customQuoteCMP] pricebookchange received — priceBookId =>', event.detail.priceBookId);
    console.log('[customQuoteCMP] pricebookchange received — currency =>', event.detail.currency);

    this.priceBookId = event.detail.priceBookId;
    this.currencyType = event.detail.currency || this.currencyType;

    console.log('[customQuoteCMP] currencyType updated to =>', this.currencyType);
}

   connectedCallback() {
    console.log('customQuoteCMP recordId =', this.recordId);
    console.log('customQuoteCMP templateId =', this.templateId);
    console.log('customQuoteCMP quoteId =', this.quoteId);

    const layoutId = this.templateId || this.recordId;
    const quoteRecordId = this.quoteId || this.recordId;

    this.loaded = true;
    if (layoutId && layoutId !== '') {
        this._effectiveRecId = layoutId; // ✅ existing record ke liye set karo
        getLayoutRecord({ mtId: layoutId })
            .then(result => {
                 console.log('[customQuoteCMP] getLayoutRecord result =>', JSON.stringify(result));
                 console.log('[customQuoteCMP] Price_Book__c from DB =>', result.QuoteForce__Price_Book__c);

                this.reportType = result.QuoteForce__Layout_Name__c;
                this.letterForm = result.QuoteForce__Letter_from_the_owner__c;
                this.priceBookId = result.QuoteForce__Price_Book__c || '';
                console.log('[customQuoteCMP] this.priceBookId set to =>', this.priceBookId);

                this.zipCode = result.QuoteForce__Zip_code_Postal_code__c;
                this.stateProvince = result.QuoteForce__State_Province__c;
                this.city = result.QuoteForce__City__c;
                this.streetAddress = result.QuoteForce__Street_Address__c;
                this.lastName = result.QuoteForce__Last_Name__c;
                this.firstName = result.QuoteForce__First_Name__c;
                this.CreatedDate = result.QuoteForce__Date__c;
                this.uploadedDocUrls.warrantyDocUrl = result.QuoteForce__Warranty_Doc__c || null;
                this.isDocAvailable.warrantyImageAvl = !!result.QuoteForce__Warranty_Doc__c;
                this.uploadedDocUrls.termConditionDocUrl = result.QuoteForce__Terms_Condition_doc__c || null;
                this.isDocAvailable.termConditionImageAvl = !!result.QuoteForce__Terms_Condition_doc__c;

                if (result.QuoteForce__Pages_JSON__c) {
                    this.ElementList = JSON.parse(result.QuoteForce__Pages_JSON__c);
                    this.ElementList.forEach(item => {
                        if (item.label === 'Title') {
                            item.selected = true;
                            this.pageLabel = item.label;
                        } else {
                            item.selected = false;
                        }
                    });
                    this.dataPageName = this.ElementList[0]?.Name || 'Title';
                }
            })
            .catch(error => console.error('loadLayouts error:', JSON.stringify(error)))
            .finally(() => { this.loaded = false; });

       this.fetchUploadedMasterTemplateDocsReadOnly();
    } else {
        this.loadConfig();
    }

    if (quoteRecordId && quoteRecordId !== '') {
        this.getQuoteDetailsFromApex();
    }
}

    warrantyUrl = '';
    termAndConditionUrl = '';

    loadConfig() {
        getAdminConfig()
            .then(result => {
                this.uploadedDocUrls.warrantyDocUrl = result.QuoteForce__Default_Warranty__c;
                this.isDocAvailable.warrantyImageAvl = !!result.QuoteForce__Default_Warranty__c;
                this.uploadedDocUrls.termConditionDocUrl = result.QuoteForce__Default_Terms_Conditions__c;
                this.isDocAvailable.termConditionImageAvl = !!result.QuoteForce__Default_Terms_Conditions__c;

                let fieldMap = {
                    'Title': result.QuoteForce__Active_Title__c,
                    'Letter from the owner': result.QuoteForce__Active_Letter_Of_Owner__c,
                    'Quote Details': result.QuoteForce__Active_Quote_Details__c,
                    'Warranty': result.QuoteForce__Active_Warranty__c,
                    'Terms and Conditions': result.QuoteForce__Active_Terms_and_Conditions__c
                };
                this.ElementList = this.ElementList.filter(elm => fieldMap[elm.Name] === true);
            })
            .catch(error => {
                this.showToast('Error', error.body.message, 'error');
            })
            .finally(() => { this.loaded = false; });
    }

    renderedCallback() {
        if (!this.customePage || !this.customPageTextPage) return;
        const richTextCmp = this.template.querySelector('lightning-input-rich-text[data-role="custom-page-richtext"]');
        if (richTextCmp) {}
    }

    refreshCustomPageEditor() {
        this.customPageEditorVisible = false;
        Promise.resolve().then(() => { this.customPageEditorVisible = true; });
    }
    getQuoteDetailsFromApex() {
        const targetId = this.quoteId || this.recordId;
        getQuoteDetails({ recordId: targetId })
            .then(result => {
                if (result) {
                    this.firstName = result.QuoteForce__First_Name__c;
                    this.lastName = result.QuoteForce__Last_Name__c;
                    this.streetAddress = result.QuoteForce__Street_Address__c;
                    this.city = result.QuoteForce__City__c;
                    this.currencyType = result.QuoteForce__Currency__c;
                    this.stateProvince = result.QuoteForce__State_Province__c;
                    this.zipCode = result.QuoteForce__Zip_code_Postal_code__c;
                    this.CreatedDate = result.QuoteForce__Date__c;
                    this.letterForm = result.QuoteForce__Letter_from_the_owner__c;
                    this.priceBookId = result.QuoteForce__Price_Book__c || '';
                    try {
                        this.ElementList = result.QuoteForce__Pages_JSON__c
                            ? JSON.parse(result.QuoteForce__Pages_JSON__c)
                            : this.ElementList;
                    } catch (e) {
                        console.error('Pages JSON parse error:', e);
                    }
                    this.uploadedDocUrls.warrantyDocUrl = result.QuoteForce__Warranty__c || null;
                    this.isDocAvailable.warrantyImageAvl = !!result.QuoteForce__Warranty__c;
                    this.uploadedDocUrls.termConditionDocUrl = result.QuoteForce__Terms_Conditions__c || null;
                    this.isDocAvailable.termConditionImageAvl = !!result.QuoteForce__Terms_Conditions__c;
                }
            })
            .catch(error => console.error('getQuoteDetailsFromApex error:', JSON.stringify(error)))
            .finally(() => { this.loaded = false; });
    }

    fetchCustomPages() {
        const targetRecordId = this.quoteId || this.recordId;
        if (!targetRecordId) return Promise.resolve([]);
        console.log(targetRecordId,"Related to recordId get custom page");
        return this.quoteId
            ? getCustomPageQuote({ recordId: targetRecordId })
            : getCustomPage({ recordId: targetRecordId });
    }

    @wire(getLayouts)
    wiredLayouts(result) {
        this.wiredLayoutsResult = result;
        if (result.data) {
            this.layouts = result.data;
            this.hasError = false;
        } else if (result.error) {
            this.hasError = true;
            this.showToast('Error', 'Failed to load layouts', 'error');
        }
    }


    @api
    async refreshLayouts() {
        try {
            await refreshApex(this.wiredLayoutsResult);
        } catch (error) {
            this.showToast('Error', 'Failed to refresh layout list', 'error');
        }
    }

    loadLayouts() {
        const layoutId = this.templateId || this.recordId;
        getLayoutRecord({ mtId: layoutId })
            .then(result => {
            console.log('[customQuoteCMP loadLayouts] Price_Book__c from DB =>', result.QuoteForce__Price_Book__c);

                this.reportType = result.QuoteForce__Layout_Name__c;
                this.letterForm = result.QuoteForce__Letter_from_the_owner__c;
                this.priceBookId = result.QuoteForce__Price_Book__c || '';
                console.log('[customQuoteCMP loadLayouts] this.priceBookId set to =>', this.priceBookId);
                this.zipCode = result.QuoteForce__Zip_code_Postal_code__c;
                this.stateProvince = result.QuoteForce__State_Province__c;
                this.city = result.QuoteForce__City__c;
                this.streetAddress = result.QuoteForce__Street_Address__c;
                this.lastName = result.QuoteForce__Last_Name__c;
                this.firstName = result.QuoteForce__First_Name__c;
                this.CreatedDate = result.QuoteForce__Date__c;
                this.primaryImage = result.QuoteForce__Primary_Image__c;
                this.secondaryImage = result.QuoteForce__Secondary_Image__c;
                this.termAndConditionUrl = result.QuoteForce__Terms_Condition_doc__c;
                this.warrantyUrl = result.QuoteForce__Warranty_Doc__c;
                this.uploadedDocUrls.warrantyDocUrl = result.QuoteForce__Warranty_Doc__c || this.uploadedDocUrls.warrantyDocUrl;
                this.isDocAvailable.warrantyImageAvl = !!this.uploadedDocUrls.warrantyDocUrl;
                this.uploadedDocUrls.termConditionDocUrl = result.QuoteForce__Terms_Condition_doc__c || this.uploadedDocUrls.termConditionDocUrl;
                this.isDocAvailable.termConditionImageAvl = !!this.uploadedDocUrls.termConditionDocUrl;
                this.layoutRecord = result;

                if (result.QuoteForce__Pages_JSON__c) {
                    this.ElementList = JSON.parse(result.QuoteForce__Pages_JSON__c);
                    this.ElementList.forEach(item => {
                        if (item.label == 'Title') {
                            item.selected = true;
                            this.pageLabel = item.label;
                        } else {
                            item.selected = false;
                        }
                    });
                    this.dataPageName = this.ElementList[0].Name;
                }
            })
            .catch(error => console.error('loadLayouts error:', JSON.stringify(error)));

        this.fetchCustomPages()
            .then(result => {
                result.forEach(element => { this.clickCount++; });
            })
            .catch(error => console.error('fetchCustomPages error:', JSON.stringify(error)));
    }
   
    handleAddCustomPage(event) {
        this.clickCount++;
        console.log('call handleAddCustomPage method');
        CreateCustomPage({
            name: 'Custom Page',
            label: `Custom Page ${this.clickCount}`,
            masterTemplateId: this.templateId || this.recordId
        })
        .then(result => {
            console.log('After create custopage method result   :'+result);
            
            let newElement = {
                Id: result.Id,
                Name: result.Name,
                label: result.QuoteForce__label__c,
                selected: result.QuoteForce__selected__c,
                editMode: result.QuoteForce__editMode__c,
                toggle: result.QuoteForce__toggle__c
            };

            this.fetchCustomPages()
                .then(result => {
                    console.log('fetch custom page  method result:-'+result);
                    result.forEach(element => {
                        console.log('element id'+element.Id);
                        if (element.Id === this.currentCustomPageRecordId) {

                            this.ctmPgType = element.QuoteForce__Type__c;
                            console.log('Element quoteforce type :-'+element.QuoteForce__Type__c);
                            if (element.QuoteForce__Type__c === 'Upload File') {
                                this.customPageUploadFile = true;
                                this.customPageTextPage = false;
                                console.log('1st custompagefile'+this.customPageUploadFile+'custompagetext'+this.customPageTextPage);
                            }
                            else if (element.QuoteForce__Type__c === 'Text Page') {
                                this.customPageUploadFile = false;
                                this.customPageTextPage = true;
                                console.log('2nd custompagefile'+this.customPageUploadFile+'custompagetext'+this.customPageTextPage);
                            }
                            else {
                                console.log('Always else part call  :')
                                this.customPageUploadFile = false;
                                this.customPageTextPage = false;
                            }
                        }
                    });
                })
                .catch(error => {
                    console.error('fetchCustomPages error:', JSON.stringify(error));
                });

            this.ElementList.push(newElement);

        })
        .catch(error => {
            console.log('not success');
            this.showToast(
                'Error',
                'Error Creating Record: ' + error.body.message,
                'error'
            );
        });
    }
    openImageDeleteModal(event) {
        this.pendingDeleteDocType = event.currentTarget.dataset.doctype;
        this.pendingDeleteContentId = event.currentTarget.dataset.contentid;
        this.isImageDeleteModalOpen = true;
    }


    handleConfirmImageDelete() {
        const doctype = this.pendingDeleteDocType;
        const contentid = this.pendingDeleteContentId;

        if (doctype === 'customPageDoc') {
            this.handleDeleteCustomPageDoc({
                currentTarget: { dataset: { doctype, contentid } }
            });
        } else {
            this.handleDeleteTempDocs({
                target: { dataset: { doctype, contentid } }
            });
        }

        this.isImageDeleteModalOpen = false;
        this.pendingDeleteDocType = null;
        this.pendingDeleteContentId = null;
    }
    handleChangeToggle(event) {
        var dataLabel = event.currentTarget.dataset.label;
        this.ElementList.forEach(result => {
            if (result.label === dataLabel) {
                result.toggle = event.target.checked;
            }
        });
        this.pageLabel = dataLabel;
    }

    handleClickPages(event) {
        let dataLabel = event.currentTarget.dataset.label;
        this.dataPageName = event.currentTarget.dataset.page;
        this.currentCustomPageRecordId = event.currentTarget.dataset.recid;
        this.toggleLabel = event.currentTarget.dataset.label;
        this.titlePageSelected = (dataLabel == 'Title') ? true : false;
        this.latterFormTheOwnerPageSelected = (dataLabel == 'Letter from the owner') ? true : false;
        this.quoteDetailPageSelected = (dataLabel == 'Quote Details') ? true : false;
        this.WarrantyPageSelected = (dataLabel == 'Warranty') ? true : false;
        this.TermsAndConditionPageSelected = (dataLabel == 'Terms and Conditions') ? true : false;
        this.customePage = dataLabel.includes("Custom Page") ? true : false;

        // FIX: loadSectionData() block removed — component ab destroy nahi hoga
        // isliye manually reload karne ki zaroorat nahi

        this.ElementList.forEach(result => {
            if (this.titlePageSelected) {
                const titlePage = this.ElementList.find(ele => ele.label === 'Title');
                if (titlePage) {
                    this.primaryImageUrl = titlePage.QuoteForce__Primary_Image__c;
                    this.secondaryImageUrl = titlePage.QuoteForce__Secondary_Image__c;
                    this.primaryImageAvailable = !!this.primaryImageUrl;
                    this.secondaryImageAvailable = !!this.secondaryImageUrl;
                }
            }
            if (result.label == dataLabel) {
                result.selected = true;
                this.pageLabel = result.label;
            } else {
                result.selected = false;
            }
        });

        if (dataLabel.includes("Custom Page")) {
            const clickedPage = this.ElementList.find(item => item.Id === this.currentCustomPageRecordId) || {};
            this.ctmPgType = '';
            this.customPageUploadFile = false;
            this.customPageTextPage = false;
            this.currentSelectedCustomPage = {
                ...clickedPage,
                Id: clickedPage.Id || this.currentCustomPageRecordId,
                Name: clickedPage.Name || dataLabel,
                label: clickedPage.label || dataLabel
            };

            const customPagePromise = this.quoteId
                ? getCustomPageQuote({ recordId: this.quoteId })
                : getCustomPage({ recordId: this.templateId || this.recordId });

            customPagePromise
                .then(result => {
                    result.forEach(element => {
                        if (element.Id == this.currentCustomPageRecordId) {
                            const type = element.QuoteForce__Type__c;
                            const freshPage = this.ElementList.find(e => e.Id === this.currentCustomPageRecordId) || {};
                            const selectedCustomPage = {
                                ...freshPage,
                                Id: element.Id,
                                Name: element.Name,
                                richTextValue: element.QuoteForce__Text_Page__c || '',
                                QuoteForce__Type__c: type,
                                customPageImageAvl: false,
                                customPageDocUrl: undefined,
                                customPageDocId: undefined
                            };

                            if (element.ContentDocumentLinks && element.ContentDocumentLinks.length > 0) {
                                const lastDoc = element.ContentDocumentLinks[element.ContentDocumentLinks.length - 1];
                                const doc = lastDoc?.ContentDocument;
                                if (doc?.LatestPublishedVersionId) {
                                    selectedCustomPage.customPageDocUrl = `/sfc/servlet.shepherd/version/download/${doc.LatestPublishedVersionId}`;
                                    selectedCustomPage.customPageImageAvl = true;
                                    selectedCustomPage.customPageDocId = lastDoc.ContentDocumentId;
                                }
                            } else {
                                const fallback = this.ElementList.find(e => e.Id === element.Id);
                                const fallbackDoc = fallback?.ContentDocument;
                                if (fallbackDoc?.LatestPublishedVersionId) {
                                    selectedCustomPage.customPageDocUrl = `/sfc/servlet.shepherd/version/download/${fallbackDoc.LatestPublishedVersionId}`;
                                    selectedCustomPage.customPageImageAvl = true;
                                    selectedCustomPage.customPageDocId = fallback?.ContentDocumentId;
                                }
                            }

                            this.ElementList = this.ElementList.map(item => {
                                if (item.Id === element.Id) {
                                    return {
                                        ...item,
                                        Id: selectedCustomPage.Id,
                                        Name: selectedCustomPage.Name,
                                        selected: true,
                                        label: selectedCustomPage.label || item.label,
                                        richTextValue: selectedCustomPage.richTextValue,
                                        QuoteForce__Type__c: selectedCustomPage.QuoteForce__Type__c,
                                        customPageDocUrl: selectedCustomPage.customPageDocUrl,
                                        customPageImageAvl: selectedCustomPage.customPageImageAvl,
                                        customPageDocId: selectedCustomPage.customPageDocId
                                    };
                                }
                                return item;
                            });

                            this.currentSelectedCustomPage = { ...selectedCustomPage };
                            this.customPageRichTextValue = this.currentSelectedCustomPage.richTextValue || '';
                            this.customPageDocUrl = this.currentSelectedCustomPage.customPageDocUrl;
                            this.customPageDocId = this.currentSelectedCustomPage.customPageDocId;
                            this.customPageImageAvl = !!this.currentSelectedCustomPage.customPageImageAvl;
                            this.refreshCustomPageEditor();

                            if (!type) {
                                this.ctmPgType = '';
                                this.customPageUploadFile = false;
                                this.customPageTextPage = false;
                                return;
                            }
                            this.ctmPgType = type;
                            if (type === 'Upload File') {
                                this.customPageUploadFile = true;
                                this.customPageTextPage = false;
                            } else if (type === 'Text Page') {
                                this.customPageUploadFile = false;
                                this.customPageTextPage = true;
                            }
                        }
                    });
                })
                .catch(error => console.error('customPagePromise error:', JSON.stringify(error)));
        }
    }

    handleInputFieldsChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
    }

    handleDateFieldsChange(event) {
        this.CreatedDate = event.target.value;
    }

    handleRichInputFieldsChange(event) {
        this.letterForm = event.target.value;
    }

    @api updateQuote() {
        this.loaded = true;
        updateQuoteDetails({
            quoteId: this.quoteId,
            firstName: this.firstName,
            lastName: this.lastName,
            streetAddress: this.streetAddress,
            city: this.city,
            stateProvince: this.stateProvince,
            zipCode: this.zipCode,
            CreatedDate: this.CreatedDate,
            layoutName: this.reportType,
            letterForm: this.letterForm,
            pagesJSON: JSON.stringify(this.ElementList),
            priceBookId: this.priceBookId || null
        })
            .then(() => {
                this.showToast('Success', 'Quote details updated successfully!', 'success');
            })
            .catch(error => console.error('updateQuote error:', JSON.stringify(error)))
            .finally(() => { this.loaded = false; });
    }

    handleChangeContact(event) {
        this.contactId = event.target.value;
    }

    handleClickEditIcon() {
        this.editBoolPages = true;
    }

    handleChangePagesName(event) {
        const updatedName = event.target.value;
        this.dataPageName = updatedName;
        this.ElementList = this.ElementList.map(item => {
            if (item.selected === true) {
                return { ...item, Name: updatedName };
            }
            return item;
        });
    }

    handleSavePagesName() {
        this.editBoolPages = false;
    }

    handleTitleViewPageClick() { this.titleViewPageModel = true; }
    handleLaterFromOwnerClick() { this.LetterFromTheOwnerModel = true; }
    handleQuoteDetailsClick() { this.QuoteDetailModel = true; }

    closeModal() {
        if (this.titleViewPageModel) this.titleViewPageModel = false;
        if (this.LetterFromTheOwnerModel) this.LetterFromTheOwnerModel = false;
        if (this.QuoteDetailModel) this.QuoteDetailModel = false;
        if (this.sqrc) this.sqrc = false;
        if (this.warrantyModalBool) this.warrantyModalBool = false;
        if (this.GLCertificatePreviewModel) this.GLCertificatePreviewModel = false;
        if (this.hearthModePreview) this.hearthModePreview = false;
        if (this.HVAC_ModePreview) this.HVAC_ModePreview = false;
        this.ConfirmationIsShowModal = false;
        this.isShowViewModal = false;
        this.isShowDeleteModal = false;
        this.isShowViewModalPDF = false;

        SectionDeleteCancel().then(() => {}).catch(() => {});
    }

    handleInspectionViewPageClick() { this.InspectionModel = true; }

    recordName = '';
    optionCount = 3;
    customPageTextPage = false;
    customPageUploadFile = false;
    @track ctmPgType = '';

    radioOptions = [
        { label: 'Upload File', value: 'Upload File' },
        { label: 'Text Page', value: 'Text Page' }
    ];

    handleRadioChange(event) {
        this.ctmPgType = event.detail.value;
        if (this.ctmPgType === 'Upload File') {
            this.customPageUploadFile = true;
            this.customPageTextPage = false;
        } else if (this.ctmPgType === 'Text Page') {
            this.customPageUploadFile = false;
            this.customPageTextPage = true;
        }
        this.currentSelectedCustomPage = {
            ...this.currentSelectedCustomPage,
            QuoteForce__Type__c: this.ctmPgType
        };
        var customObj = {
            Id: this.currentCustomPageRecordId,
            QuoteForce__Type__c: this.ctmPgType
        };
        updateCustomPage({ customObj: customObj })
            .then(() => {})
            .catch(error => console.error('updateCustomPage error:', JSON.stringify(error)));
    }
    handleCustomPageTypeCardClick(event) {
        const type = event.currentTarget.dataset.value;
        this.handleRadioChange({ detail: { value: type } });
    }
    handleInputChange(event) {
        this.recordName = event.target.value;
    }

    @api
    async handleSaveTeamplate() {
        console.log('check bundle id :-'+this.selectedBundleId);
        if (!this.reportType) {
            this.showToast('Error', 'Layout Name is required', 'error');
            return;
        }

        try {
            this.loaded = true;
            const layoutId = this.templateId || this.recordId;

            // Duplicate check — wiredLayouts se already data available hai
            const layouts = this.layouts || [];
            const isDuplicate = layouts.some(layout =>
                layout.QuoteForce__Layout_Name__c === this.reportType &&
                layout.Id !== layoutId
            );

            if (isDuplicate) {
                this.showToast('Error', `Layout with name "${this.reportType}" already exists.`, 'error');
                this.loaded = false;
                return;
            }

            if (layoutId) {
                var mstTmpObj = {
                    'Id': layoutId,
                    'QuoteForce__Layout_Name__c': this.reportType,
                    'QuoteForce__Letter_from_the_owner__c': this.letterForm,
                    'QuoteForce__Zip_code_Postal_code__c': this.zipCode,
                    'QuoteForce__State_Province__c': this.stateProvince,
                    'QuoteForce__City__c': this.city,
                    'QuoteForce__Street_Address__c': this.streetAddress,
                    'QuoteForce__Last_Name__c': this.lastName,
                    'QuoteForce__First_Name__c': this.firstName,
                    'QuoteForce__Date__c': this.CreatedDate,
                    'QuoteForce__Primary_Image__c': this.uploadedDocUrls.primaryDocUrl,
                    'QuoteForce__Secondary_Image__c': this.uploadedDocUrls.secondaryDocUrl,
                    'QuoteForce__Warranty_Doc__c': this.uploadedDocUrls.warrantyDocUrl,
                    'QuoteForce__Terms_Condition_doc__c': this.uploadedDocUrls.termConditionDocUrl,
                    'QuoteForce__Pages_JSON__c': JSON.stringify(this.ElementList),
                    'QuoteForce__Price_Book__c': this.priceBookId || null,
                    'QuoteForce__Currency__c': this.currencyType || null,
                    'QuoteForce__Product_bundle__c':this.selectedBundleId|| null
                };
                
                console.log('[customQuoteCMP][handleSaveTeamplate][UPDATE] priceBookId =>', this.priceBookId);
                console.log('[customQuoteCMP][handleSaveTeamplate][UPDATE] currencyType =>', this.currencyType);

                UpdateMasterLayout({ mstLayoutObj: mstTmpObj })
                    .then(result => {
                        this.showToast('Success', 'Template Updated Successfully!', 'success');
                        this.uploadBulkFilesSF(result.Id);
                        this.fetchUploadedMasterTemplateDocs();
                        this.dispatchEvent(new CustomEvent('save'));
                        this.closeModal();
                        this.refreshLayouts();

                        // ✅ FIX: priceBookId save karo PEHLE loadLayouts() se
                        const savedPriceBookId = this.priceBookId;

                        this.loadLayouts();

                        // ✅ FIX: loadLayouts() ke baad priceBookId restore karo
                        Promise.resolve().then(() => {
                            if (savedPriceBookId) {
                                this.priceBookId = savedPriceBookId;
                            }
                        });

                        this.dispatchEvent(new CustomEvent('closemodal'));
                    })
                    .catch(error => {
                        this.showToast('Error', 'Failed to update record', 'error');
                    })
                    .finally(() => { this.loaded = false; });
            } else {
                var mstTmpObj = {
                    'QuoteForce__Layout_Name__c': this.reportType,
                    'QuoteForce__Letter_from_the_owner__c': this.letterForm,
                    'QuoteForce__Zip_code_Postal_code__c': this.zipCode,
                    'QuoteForce__State_Province__c': this.stateProvince,
                    'QuoteForce__City__c': this.city,
                    'QuoteForce__Street_Address__c': this.streetAddress,
                    'QuoteForce__Last_Name__c': this.lastName,
                    'QuoteForce__First_Name__c': this.firstName,
                    'QuoteForce__Date__c': this.CreatedDate,
                    'QuoteForce__Primary_Image__c': this.uploadedDocUrls.primaryDocUrl || null,
                    'QuoteForce__Secondary_Image__c': this.uploadedDocUrls.secondaryDocUrl || null,
                    'QuoteForce__Warranty_Doc__c': this.uploadedDocUrls.warrantyDocUrl || null,
                    'QuoteForce__Terms_Condition_doc__c': this.uploadedDocUrls.termConditionDocUrl || null,
                    'QuoteForce__Pages_JSON__c': JSON.stringify(this.ElementList),
                    'QuoteForce__Price_Book__c': this.priceBookId || null,
                    'QuoteForce__Currency__c': this.currencyType || null,
                    'QuoteForce__Product_bundle__c':this.selectedBundleId|| null
                };

                console.log('[customQuoteCMP][handleSaveTeamplate][CREATE] priceBookId =>', this.priceBookId);
                console.log('[customQuoteCMP][handleSaveTeamplate][CREATE] currencyType =>', this.currencyType);

                CreateMasterLayout({ mstLayoutObj: mstTmpObj })
                    .then(async result => {
                        this.recordId = result.Id;
                        this.templateId = result.Id;
                        this.fetchUploadedMasterTemplateDocs();

                        const childCmp = this.template.querySelector('c-quote-detail-cmp');
                        console.log('childCmp =>', childCmp);

                        if (childCmp) {
                            await childCmp.persistDraftSections(result.Id);
                        }
                        this._effectiveRecId = result.Id;


                        this.showToast('Success', 'Template Created Successfully!', 'success');
                        this.uploadBulkFilesSF(result.Id);
                        this.dispatchEvent(new CustomEvent('edit', { detail: { recordId: this.recordId } }));
                        this.dispatchEvent(new CustomEvent('save'));
                        this.dispatchEvent(new CustomEvent('closemodal'));
                        this.refreshLayouts();
                        this.loadLayouts();

                        this.ElementList.forEach(item => {
                            if (item.Name === 'Custom Page') {
                                var customObj = {
                                    'Id': item.Id,
                                    'QuoteForce__Master_Template__c': this.recordId
                                };
                                updateCustomPage({ customObj: customObj })
                                    .then(() => {})
                                    .catch(error => {
                                        this.showToast('Error', 'Error Creating Record: ' + error.body.message, 'error');
                                    });
                            }
                        });
                    })
                    .catch(error => {
                        this.showToast('Error', 'Error Creating Record: ' + error.body.message, 'error');
                    })
                    .finally(() => { this.loaded = false; });
            }
        } catch (error) {
            this.loaded = false;
            this.showToast('Error', 'An unexpected error occurred: ' + (error.body?.message || error.message), 'error');
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    fileError = '';

    handleUploadDocuments(event) {
        try {
            this.fileError = '';
            const file = event.target.files[0];
            if (!file) return;

            const fileName = file.name.toLowerCase();
            const isValid = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');
            if (!isValid) {
                this.fileError = 'Only PNG, JPG, or JPEG formats are allowed.';
                event.target.value = null;
                return;
            }

            let docType = event.target.name;
            if (event.target.files.length > 0) {
                const file = event.target.files[0];
                const fileUrl = URL.createObjectURL(file);
                var reader = new FileReader();
                console.log('Selected quote Id =parent Id:', this.quoteId);
                console.log('current custom page record id', this.currentCustomPageRecordId);
                reader.onload = () => {
                    var base64 = reader.result.split(',')[1];
                    let tempObj = {
                        'filename': docType,
                        'base64': base64,
                        'quoteId': ((this.currentCustomPageRecordId)?.length > 15) ? this.currentCustomPageRecordId : this.quoteId
                    };
                    this.uploadedDocumentList.push(tempObj);

                    uploadFile({ base64Data: base64, fileName: file.name, parentId: tempObj.quoteId })
                        .then(() => {})
                        .catch(error => console.error('uploadFile error:', JSON.stringify(error)));

                    if (docType == 'primaryDoc') {
                        this.uploadedDocUrls.primaryDocUrl = fileUrl;
                        this.isDocAvailable.primaryImageAvl = true;
                    } else if (docType == 'SecondaryDoc') {
                        this.uploadedDocUrls.secondaryDocUrl = fileUrl;
                        this.isDocAvailable.secondaryImageAvl = true;
                    } else if (docType == 'TermConditionDoc') {
                        this.uploadedDocUrls.termConditionDocUrl = fileUrl;
                        this.isDocAvailable.termConditionImageAvl = true;
                    } else if (docType == 'warrantyDoc') {
                        this.uploadedDocUrls.warrantyDocUrl = fileUrl;
                        this.isDocAvailable.warrantyImageAvl = true;
                    } else if (docType == 'customPageDoc') {
                        if (this.currentCustomPageRecordId?.length > 15) {
                            this.currentSelectedCustomPage = {
                                ...this.currentSelectedCustomPage,
                                customPageDocUrl: fileUrl,
                                customPageImageAvl: true
                            };
                            this.customPageDocUrl = fileUrl;
                            this.customPageImageAvl = true;
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.error('handleUploadDocuments error:', JSON.stringify(error));
        }
    }

    handleDeleteTempDocs(event) {
        try {
            let docType = event.target.dataset.doctype;
            let contentDocId = event.target.dataset.contentid;
            switch (docType) {
                case 'primaryDoc':
                    if (contentDocId) this.deleteMasterTemplateDocsSF(contentDocId, 'Primary Image');
                    this.uploadedDocUrls.primaryDocUrl = undefined;
                    this.isDocAvailable.primaryImageAvl = false;
                    this.removeTempDoc(docType);
                    break;
                case 'SecondaryDoc':
                    if (contentDocId) this.deleteMasterTemplateDocsSF(contentDocId, 'Secondary Image');
                    this.uploadedDocUrls.secondaryDocUrl = undefined;
                    this.isDocAvailable.secondaryImageAvl = false;
                    this.removeTempDoc(docType);
                    break;
                case 'warrantyDoc':
                    if (contentDocId) this.deleteMasterTemplateDocsSF(contentDocId, 'Warranty Image');
                    this.uploadedDocUrls.warrantyDocUrl = undefined;
                    this.isDocAvailable.warrantyImageAvl = false;
                    this.removeTempDoc(docType);
                    break;
                case 'TermConditionDoc':
                    if (contentDocId) this.deleteMasterTemplateDocsSF(contentDocId, 'Term & Condition Image');
                    this.uploadedDocUrls.termConditionDocUrl = undefined;
                    this.isDocAvailable.termConditionImageAvl = false;
                    this.removeTempDoc(docType);
                    break;
                case 'customPageDoc':
                    if (contentDocId) this.deleteMasterTemplateDocsSF(contentDocId, 'Custom Page Document');
                    this.currentSelectedCustomPage = {
                        ...this.currentSelectedCustomPage,
                        customPageDocUrl: undefined,
                        customPageImageAvl: false
                    };
                    this.customPageDocUrl = undefined;
                    this.customPageImageAvl = false;
                    this.removeTempDoc(docType);
                    break;
            }
        } catch (error) {
            console.error('handleDeleteTempDocs error:', JSON.stringify(error));
        }
    }

    handleDeleteCustomPageDoc(event) {
        try {
            let docType = event.currentTarget.dataset.doctype;
            let contentDocId = event.currentTarget.dataset.contentid;
            if (contentDocId) this.deleteMasterTemplateDocsSF(contentDocId, 'Custom Page Document');
            this.currentSelectedCustomPage = {
                ...this.currentSelectedCustomPage,
                customPageDocUrl: undefined,
                customPageDocId: undefined,
                customPageImageAvl: false
            };
            this.customPageDocUrl = undefined;
            this.customPageImageAvl = false;
            this.removeTempDoc(docType);
        } catch (error) {
            console.error('handleDeleteCustomPageDoc error:', JSON.stringify(error));
        }
    }

    removeTempDoc(docType) {
        try {
            const index = this.uploadedDocumentList.findIndex(ele => ele.filename == docType);
            if (index !== -1) this.uploadedDocumentList.splice(index, 1);
        } catch (error) {}
    }

    async uploadBulkFilesSF(recordId) {
        try {
            await uploadBulkFiles({ filesJson: JSON.stringify(this.uploadedDocumentList), recId: recordId });
        } catch (error) {
            console.error('uploadBulkFilesSF error:', JSON.stringify(error));
        }
    }

    async fetchQuoteDocumentsOnly() {
        try {
            const result = await getQuoteDocumentLinks({ quoteId: this.quoteId });
            if (result?.ContentDocumentLinks?.length > 0) {
                result.ContentDocumentLinks.forEach(ele => {
                    let imageUrl = `/sfc/servlet.shepherd/version/download/${ele?.ContentDocument?.LatestPublishedVersionId}`;
                    let imageTitle = ele?.ContentDocument?.Title;
                    let conDoctId = ele?.ContentDocumentId;
                    if (imageTitle === 'primaryDoc') { this.uploadedDocUrls.primaryDocUrl = imageUrl; this.isDocAvailable.primaryImageAvl = true; this.contentDocId.primaryDocId = conDoctId; }
                    if (imageTitle === 'SecondaryDoc') { this.uploadedDocUrls.secondaryDocUrl = imageUrl; this.isDocAvailable.secondaryImageAvl = true; this.contentDocId.secondaryDocId = conDoctId; }
                    if (imageTitle == 'warrantyDoc') { this.uploadedDocUrls.warrantyDocUrl = imageUrl; this.isDocAvailable.warrantyImageAvl = true; this.contentDocId.warrantyDocId = conDoctId; }
                    if (imageTitle == 'TermConditionDoc') { this.uploadedDocUrls.termConditionDocUrl = imageUrl; this.isDocAvailable.termConditionImageAvl = true; this.contentDocId.termConDocId = conDoctId; }
                });
            }
        } catch (error) {
            console.error('fetchQuoteDocumentsOnly error:', JSON.stringify(error));
        }
    }

async fetchUploadedMasterTemplateDocs() {
        try {
            const layoutId = this.templateId || this.recordId;
            const result = await getLayoutRecord({ mtId: layoutId });
            if (result) {
                result?.ContentDocumentLinks.forEach(ele => {
                    let imageUrl = `/sfc/servlet.shepherd/version/download/${ele?.ContentDocument?.LatestPublishedVersionId}`;
                    let imageTitle = ele?.ContentDocument?.Title;
                    let conDoctId = ele?.ContentDocumentId;
                    if (imageTitle === 'primaryDoc') { this.uploadedDocUrls.primaryDocUrl = imageUrl; this.isDocAvailable.primaryImageAvl = true; this.contentDocId.primaryDocId = conDoctId; }
                    else if (imageTitle === 'SecondaryDoc') { this.uploadedDocUrls.secondaryDocUrl = imageUrl; this.isDocAvailable.secondaryImageAvl = true; this.contentDocId.secondaryDocId = conDoctId; }
                    else if (imageTitle === 'warrantyDoc') { this.uploadedDocUrls.warrantyDocUrl = imageUrl; this.isDocAvailable.warrantyImageAvl = true; this.contentDocId.warrantyDocId = conDoctId; }
                    else if (imageTitle === 'TermConditionDoc') { this.uploadedDocUrls.termConditionDocUrl = imageUrl; this.isDocAvailable.termConditionImageAvl = true; this.contentDocId.termConDocId = conDoctId; }
                });

                // ✅ FIX (CSRF safeguard): only re-link docs to the Quote if this is a
                // genuinely NEW upload that hasn't been attached yet this session.
                // Prevents a DML call from firing silently on every page load.
                const hasNewDocsToLink =
                    (this.contentDocId.primaryDocId || this.contentDocId.secondaryDocId ||
                     this.contentDocId.warrantyDocId || this.contentDocId.termConDocId) &&
                    !this._docsAlreadyLinkedThisSession;

                if (hasNewDocsToLink) {
                    await attachDocsToQuote({
                        quoteId: this.quoteId,
                        primaryDocId: this.contentDocId.primaryDocId,
                        secondaryDocId: this.contentDocId.secondaryDocId,
                        warrantyDocId: this.contentDocId.warrantyDocId,
                        termConDocId: this.contentDocId.termConDocId
                    });
                    this._docsAlreadyLinkedThisSession = true;
                }
            }
        } catch (error) {
            console.error('fetchUploadedMasterTemplateDocs error:', JSON.stringify(error));
        }
    }

    async deleteMasterTemplateDocsSF(contentId, fileName) {
        this.loaded = true;
        try {
            await deleteFile({ contentDocumentId: contentId });
            this.showToast('Success', `${fileName} Deleted successfully`, 'success');
        } catch (error) {
            this.showToast('Error', 'Failed to delete The Document: ' + error?.body?.message, 'error');
        } finally {
            this.loaded = false;
        }
    }

    handleEditCustomPageName() { this.editCustomPageName = true; }

    handleChangeCustomPageName(event) {
        const newName = event.target.value;
        const recId = event.target.dataset.recid;
        this.currentSelectedCustomPage = { ...this.currentSelectedCustomPage, Name: newName };
        this.ElementList = this.ElementList.map(item => {
            if (item.Id === recId) {
                return { ...item, Name: newName, label: newName };
            }
            return item;
        });
    }

    async handleSaveCustomPageName(event) {
        try {
            this.editCustomPageName = false;
            let recId = event.target.dataset.recid;
            let tempCustomObj = { 'Id': recId, 'Name': this.currentSelectedCustomPage.Name };
            await updateCustomPage({ customObj: tempCustomObj });
        } catch (error) {
            this.showToast('Unexpected Error!', 'Unable to update the Custom Page Name.', 'error');
        }
    }

    handleTextValueChange(event) {
        this.currentSelectedCustomPage = { ...this.currentSelectedCustomPage, richTextValue: event.target.value };
    }

    async handleUpdateCustomTextFieldValue(event) {
        try {
            let recId = event.target.dataset.recid;
            let tempCustomObj = { 'Id': recId, 'QuoteForce__Text_Page__c': this.currentSelectedCustomPage.richTextValue };
            await updateCustomPage({ customObj: tempCustomObj });
        } catch (error) {
            this.showToast('Unexpected Error!', 'Unable to update the Text Field Value.', 'error');
        }
    }

    @track deleteCustomPageModal = false;
    @track selectedDeletPageRecord;

    handleClickOnDeleteCustomPage(event) {
        this.deleteCustomPageModal = true;
        this.selectedDeletPageRecord = event.currentTarget.dataset.recid;
    }

    handleClickOnCancelDeleteCustomPage() {
        this.deleteCustomPageModal = false;
    }

    handleDeleteCustomPage() {
        this.loaded = true;
        const layoutId = this.selectedDeletPageRecord;
        this.ElementList = this.ElementList.filter(item => item.Id !== layoutId);

        deleteLayoutPage({ layoutId })
            .then(() => {
                this.showToast('Success', 'Template successfully deleted!', 'success');
                const mstTmpObj = {
                    'Id': this.templateId || this.recordId,
                    'QuoteForce__Pages_JSON__c': JSON.stringify(this.ElementList)
                };
                UpdateMasterLayout({ mstLayoutObj: mstTmpObj })
                    .then(() => {
                        this.handleClickOnCancelDeleteCustomPage();
                        this.ElementList.forEach(result => {
                            if (result.label == 'Title') {
                                result.selected = true;
                                this.titlePageSelected = true;
                                this.pageLabel = result.label;
                            } else {
                                result.selected = false;
                            }
                        });
                    })
                    .catch(error => console.error('UpdateMasterLayout error:', JSON.stringify(error)))
                    .finally(() => { this.loaded = false; });
            })
            .catch(error => {
                this.loaded = false;
                this.showToast('Error', 'Failed to delete layout or associated files', 'error');
            });
    }
    async fetchUploadedMasterTemplateDocsReadOnly() {
    try {
        const layoutId = this.templateId || this.recordId;
        const result = await getLayoutRecord({ mtId: layoutId });
        if (result) {
            result?.ContentDocumentLinks.forEach(ele => {
                let imageUrl = `/sfc/servlet.shepherd/version/download/${ele?.ContentDocument?.LatestPublishedVersionId}`;
                let imageTitle = ele?.ContentDocument?.Title;
                let conDoctId = ele?.ContentDocumentId;
                if (imageTitle === 'primaryDoc') { this.uploadedDocUrls.primaryDocUrl = imageUrl; this.isDocAvailable.primaryImageAvl = true; this.contentDocId.primaryDocId = conDoctId; }
                else if (imageTitle === 'SecondaryDoc') { this.uploadedDocUrls.secondaryDocUrl = imageUrl; this.isDocAvailable.secondaryImageAvl = true; this.contentDocId.secondaryDocId = conDoctId; }
                else if (imageTitle === 'warrantyDoc') { this.uploadedDocUrls.warrantyDocUrl = imageUrl; this.isDocAvailable.warrantyImageAvl = true; this.contentDocId.warrantyDocId = conDoctId; }
                else if (imageTitle === 'TermConditionDoc') { this.uploadedDocUrls.termConditionDocUrl = imageUrl; this.isDocAvailable.termConditionImageAvl = true; this.contentDocId.termConDocId = conDoctId; }
            });
        }
    } catch (error) {
        console.error('fetchUploadedMasterTemplateDocsReadOnly error:', JSON.stringify(error));
    }
} 
    handleCancelImageDelete() {
   isImageDeleteModalOpen = false;
    pendingDeleteDocType = null;
    pendingDeleteContentId = null;
  
}
    handleBundleChangeFromChild(event) {
        console.log(
            '[customQuoteCMP] Bundle received =>',
            event.detail.selectedBundleId
        );

        this.selectedBundleIdtest = event.detail.selectedBundleId;
    }
}