import { LightningElement, api } from 'lwc';
export default class HeaderCmp extends LightningElement {
    @api title;
    @api titleSec;
}