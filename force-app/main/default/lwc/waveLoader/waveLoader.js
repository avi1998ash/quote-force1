import { LightningElement } from 'lwc';
export default class WaveLoader extends LightningElement {
      blocks = Array.from({ length: 16 }, (_, i) => i + 1);
}