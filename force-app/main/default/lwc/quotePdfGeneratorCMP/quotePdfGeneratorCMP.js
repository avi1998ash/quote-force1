import { LightningElement, track } from 'lwc';
import html2canvasLib from '@salesforce/resourceUrl/html2canvas';
import jsPDFLib from '@salesforce/resourceUrl/jsPDF';
import { loadScript } from 'lightning/platformResourceLoader';

export default class QuotePdfGeneratorCMP extends LightningElement {
    pdfUrl;
    librariesLoaded = false;

    renderedCallback() {
        if (this.librariesLoaded) return;

        Promise.all([
            loadScript(this, html2canvasLib),
            loadScript(this, jsPDFLib)
        ])
            .then(() => {
                this.librariesLoaded = true;
                window.jsPDF = window.jspdf.jsPDF; // required for UMD version
            })
            .catch(error => {
                console.error('Script load error', error);
            });
    }

    generatePDF() {
        setTimeout(() => {
            // brute force select div with known content
            const divs = this.template.querySelectorAll('div');

            let content = null;
            divs.forEach((div) => {
                if (div.textContent && div.textContent.includes('Quote Summary')) {
                    content = div;
                }
            });

            console.log('Selected content div:', content);

            if (!content) {
                console.error('❌ Still couldn’t find the PDF content.');
                return;
            }

            // Safe render now
            window.html2canvas(content, {
                useCORS: true,
                allowTaint: true,
                logging: true,
                backgroundColor: '#ffffff'
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new window.jsPDF();
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

                const blob = pdf.output('blob');
                this.pdfUrl = URL.createObjectURL(blob);
            }).catch((err) => {
                console.error('❌ html2canvas failed:', err);
            });
        }, 300);
    }

}