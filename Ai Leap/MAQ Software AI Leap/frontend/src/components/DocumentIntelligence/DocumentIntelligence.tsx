import './DocumentIntelligence.css'
import axios from "axios";
// import "font-awesome/css/font-awesome.min.css";
import { PROTOCOL, ENDPOINT, documentIntelligence } from "../../api/api";
import { Download, Upload, Pencil, Check } from "lucide-react";
import React, { useState, useEffect } from "react";
import invoicepdf from '../../../public/files/sample invoice.pdf'
// import LeftPanel1 from '../../Context/LeftPanel1';
// Define types for invoice data
interface Invoice {
  "File Name"?: string;
  "Invoice Number": string;
  "Invoice Date"?: string;
  "Total Amount": number;
  "Company Name"?: string;
  active?: string;
}

// Define message type for chatbot
// interface ChatMessage {
//   sender: "user" | "bot";
//   text: string;
// }

const DocumentIntelligence = () => {
  const [invoiceData, setInvoiceData] = useState<Invoice[]>([]);
  const [folderName, setFolderName] = useState<string>("");
  // const folderName=''
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isGenerateEnabled, setIsGenerateEnabled] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [generatingRow, setGeneratingRow] = useState<number | null>(null);
  const [useSampleFile, setUseSampleFile] = useState(false);
  const [sampleFile, setSampleFile] = useState('');


  // Chatbot
  const [chatVisible, setChatVisible] = useState<boolean>(false);
  // const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  // const [userMessage, setUserMessage] = useState<string>("");

  // Toggle chatbot visibility
  const toggleChat = () => {
    setChatVisible(!chatVisible);
  };

  // Handle message submission
  // const handleSendMessage = () => {
  //   if (userMessage.trim()) {
  //     setChatMessages((prevMessages) => [
  //       ...prevMessages,
  //       { sender: "user", text: userMessage },
  //     ]);

  //     // Simulate bot response
  //     setTimeout(() => {
  //       setChatMessages((prevMessages) => [
  //         ...prevMessages,
  //         { sender: "bot", text: "Thank you for your message! How can I assist you further?" },
  //       ]);
  //     }, 1000);

  //     setUserMessage("");
  //   }
  // };

  // Disable scrolling when loading is true
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = loading ? "hidden" : "auto";
  }, [loading]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
      console.log(selectedPdf)
      setIsGenerateEnabled(false);
    }
  };

  const handleGenerateSingle = async (invoice: Invoice, index: number) => {
    setGeneratingRow(index);

    const payload: any = {
      invoiceNumber: invoice["Invoice Number"],
      totalAmount: invoice["Total Amount"],
    };
    if (invoice["File Name"]) payload.fileName = invoice["File Name"];
    if (invoice["Invoice Date"]) payload.invoiceDate = invoice["Invoice Date"];
    if (invoice["Company Name"]) payload.companyName = invoice["Company Name"];

    const data = { invoices: payload, folderName };

    try {
      const response = await axios.post(
        `${PROTOCOL}://${ENDPOINT}/generateSingle`,
        data,
        {
          headers: { "Content-Type": "application/json" },
          responseType: "arraybuffer",
        }
      );

      const xmlData = new TextDecoder().decode(response.data);
      const blob = new Blob([xmlData], { type: "application/xml" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const safeName = (invoice["File Name"] ?? "invoice").replace(".pdf", "");
      link.download = `${safeName}.xml`;
      link.click();

      setGeneratingRow(null);
    } catch (error) {
      console.error("Error generating LEDES file:", error);
      alert("Failed to generate LEDES file");
      setGeneratingRow(null);
    }
  };

  const handleActionClick = (index: number, action: string) => {
    if (invoiceData[index].active === "disabled") return;

    const updatedInvoiceData = [...invoiceData];
    updatedInvoiceData[index] = {
      ...updatedInvoiceData[index],
      active: action,
    };

    const allMarked = updatedInvoiceData.every((inv) => inv.active === "check");
    setIsGenerateEnabled(allMarked);
    setInvoiceData(updatedInvoiceData);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0 && !useSampleFile) {
      alert("Please select files to upload");
      return;
    }

    setLoading(true);
    setActiveStep(0);

    const formData = new FormData();

    if (useSampleFile) {
      try {

        const response = await fetch(invoicepdf);
        const blob = await response.blob();
        const selectedinvoiceFile = new File([blob], "sample.pdf", { type: "application/pdf" });
        formData.append("files", selectedinvoiceFile);
        setSelectedFiles([selectedinvoiceFile])

      } catch (error) {
        // setError("Failed to load sample file. Please try again.");
        // setIsLoading(false);
        return;
      }
    }
    else {
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
    }


    try {
      const response = await axios.post(
        `${PROTOCOL}://${ENDPOINT}/processInvoice`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // let invoice_data = [
      //   {
      //     "File Name": "3229472.pdf",
      //     "Invoice Number": "INV-12345",
      //     "Invoice Date": "2025-03-14",
      //     "Total Amount": 17912.51,
      //     "Company Name": "Acme Corp",
      //   },
      //   {
      //     "File Name": "Sample invoice.pdf",
      //     "Invoice Number": "INV-12346",
      //     "Invoice Date": "2025-03-01",
      //     "Total Amount": 150.75,
      //     "Company Name": "Acme Corp",
      //   },
      //   {
      //     "File Name": "invoice_003.pdf",
      //     "Invoice Number": "INV-12346",
      //     "Invoice Date": "2025-03-01",
      //     "Total Amount": 150.75,
      //     "Company Name": "Acme Corp",
      //   },
      //   {
      //     "File Name": "invoice_003.pdf",
      //     "Invoice Number": "INV-12346",
      //     "Invoice Date": "2025-03-01",
      //     "Total Amount": 150.75,
      //     "Company Name": "Acme Corp",
      //   },
      //   {
      //     "File Name": "invoice_003.pdf",
      //     "Invoice Number": "INV-12346",
      //     "Invoice Date": "2025-03-01",
      //     "Total Amount": 150.75,
      //     "Company Name": "Acme Corp",
      //   },
      //   {
      //     "File Name": "invoice_003.pdf",
      //     "Invoice Number": "INV-12346",
      //     "Invoice Date": "2025-03-01",
      //     "Total Amount": 150.75,
      //     "Company Name": "Acme Corp",
      //   },
      // ];
      // setInvoiceData(invoice_data);

      setInvoiceData(response.data.invoice_data);
      setFolderName(response.data.folder_name);
      setActiveStep(1);
      setLoading(false);
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload files");
      setLoading(false);
    }
  };

  const handleRunDocIntelligence = async () => {
    // Use the sample file served from the frontend when available
    let pdfUrl = "";
    if (useSampleFile) {
      const samplePath = `files/${encodeURIComponent('sample invoice.pdf')}`;
      pdfUrl = `${window.location.origin}/${samplePath}`;
    } else if (selectedFiles.length > 0) {
      alert('Document Intelligence via backend expects a publicly-accessible PDF URL. Use the sample file or host your PDF.');
      return;
    } else {
      alert('No file available. Use sample file or upload PDFs.');
      return;
    }

    setLoading(true);
    try {
      const query = 'Extract key invoice fields';
      const resp = await documentIntelligence(pdfUrl, query);
      console.log('DocIntelligence response', resp);
      alert(resp.answer || JSON.stringify(resp));
    } catch (err: any) {
      console.error('DocIntelligence error', err);
      alert('Document intelligence failed: ' + (err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  const handlePdfSelect = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const selectedFile = selectedFiles.find(
      (file) => file.name === (invoice["File Name"] ?? "")
    );
    setSelectedPdf(selectedFile || null);
  };

  const handleGenerate = async () => {
    setActiveStep(2);
    setIsGenerating(true);

    const payload = invoiceData.map((invoice) => {
      const data: any = {
        invoiceNumber: invoice["Invoice Number"],
        totalAmount: invoice["Total Amount"],
      };
      if (invoice["File Name"]) data.fileName = invoice["File Name"];
      if (invoice["Invoice Date"]) data.invoiceDate = invoice["Invoice Date"];
      if (invoice["Company Name"]) data.companyName = invoice["Company Name"];
      return data;
    });

    const data = { invoices: payload, folderName: folderName };

    try {
      const response = await axios.post(
        `${PROTOCOL}://${ENDPOINT}/generate`,
        data,
        {
          headers: { "Content-Type": "application/json" },
          responseType: "arraybuffer", // Important: to handle the XML response as a binary buffer
        },
      );

      // The XML data will be in the response body as a binary buffer
      const xmlData = new TextDecoder().decode(response.data); // Decode the binary buffer to a string

      const blob = new Blob([xmlData], { type: "application/xml" });
      console.log("insideeeeee");

      // Create a link element for downloading
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob); // Create an object URL for the Blob
      link.download = `ledes_output_xml.xml`; // Set the file name with .xml extension

      // Trigger the download
      link.click();

      // Wait for 2 seconds then update the UI
      setTimeout(() => {
        setActiveStep(3);
        // alert('File generated correctly.');

        // Disable all action buttons by setting active to 'disabled'
        const updatedInvoiceData = invoiceData.map((invoice) => ({
          ...invoice,
          active: "disabled",
        }));
        setInvoiceData(updatedInvoiceData);
        setIsGenerateEnabled(false);
        setIsGenerating(false);
      }, 2000);
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload files");
      setIsGenerating(false);
    }
  };

  const handleCheck = (index: number, field: string, value: string) => {
    const updatedInvoiceData = [...invoiceData];
    updatedInvoiceData[index] = {
      ...updatedInvoiceData[index],
      [field]: value,
    };
    setInvoiceData(updatedInvoiceData);

    // Update the selected invoice if it's the one being edited
    if (
      selectedInvoice &&
      selectedInvoice["File Name"] === updatedInvoiceData[index]["File Name"]
    ) {
      setSelectedInvoice(updatedInvoiceData[index]);
    }
  };

  const generateXML = (invoice: Invoice | null): string => {
    if (!invoice) return "";

    return `
      <LEDESXMLBilling2.1 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="LEDESXML2.1.xsd">
        <Invoice>
          <InvoiceNumber>${invoice["Invoice Number"]}</InvoiceNumber>
          <InvoiceDate>${invoice["Invoice Date"] ?? ""}</InvoiceDate>
          <CompanyName>${invoice["Company Name"] ?? ""}</CompanyName>
          <InvoiceAmount>${invoice["Total Amount"]}</InvoiceAmount>
          <FileName>${invoice["File Name"] ?? ""}</FileName>
        </Invoice>
      </LEDESXMLBilling2.1>
    `;
  };

  return (
    <div className='parent-DocumentIntelligenceApp'>
      {/* side panel  */}
      {/* <LeftPanel1/> */}
    
    <div className="DocumentIntelligenceApp">
      <div className="left-panel">
        <div className="toggle-switch">
          <button
            type="button"
            className={`toggle-btn active`}
            style={{marginBottom:'8px'}}
          >
            {/* <FileSpreadsheet size={22} className="toggle-icon" />&nbsp;&nbsp; */}
            <span style={{ fontSize: '22px', color: '#000',fontWeight:'600' }}>Invoice Management</span>
          </button>
          <br />
        </div>


        {/* <div style={{
          padding: '12px',
          backgroundColor: '#ebf3fc',
          borderRadius: '6px',
          border: '1px solid #115ea3',
          marginBottom: '2px',
         
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>

            <p style={{
              margin: 0,
              fontSize: '13px',
              color: '#000',
              lineHeight: '1.4'
            }}>
              An end-to-end solution that extracts invoice data from PDFs using Azure Document Intelligence, enabling verification and conversion to LEDES format with secure storage and audit logging.
            </p>
          </div>
        </div> */}
        {/* Upload container  */}
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-dotted border-gray-300">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Upload Invoice
            </h3>

            <label className="flex items-center justify-center gap-2 px-6 py-3 bg-[#801818] hover:bg-[#6b1414] text-white font-medium rounded-lg cursor-pointer transition-colors duration-200 w-full sm:w-auto">
              <Upload size={18} />
              <span>Upload Files</span>
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {selectedFiles.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700 block mb-2">
                  Selected Files:
                </span>
                <ul className="space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 flex items-center gap-2 py-1"
                    >
                      <span className="w-1.5 h-1.5 bg-[#801818] rounded-full"></span>
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        
        {/* toggle sample file */}
        <div className="sample-file-toggle" style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: '10px'
        }}>
          <label
            htmlFor="sample-file-toggle"
            style={{
              marginRight: '10px',
              display: 'flex',
              alignItems: 'center',
              color:'#000'
            }}
          >
            Use Sample File
          </label>
          <button
            type="button"
            id="sample-file-toggle"
            onClick={() => setUseSampleFile(!useSampleFile)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '24px',
              borderRadius: '12px',
              backgroundColor: useSampleFile ? '#801818' : '#cbd5e0',
              border: 'none',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <span style={{
              position: 'absolute',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'white',
              transform: useSampleFile ? 'translateX(8px)' : 'translateX(-8px)',
              transition: 'transform 0.2s ease'
            }} />
          </button>
        </div>

        {/* sample files */}
        {useSampleFile &&
          <div className="language-selection-wrapper" style={{
            marginBottom: '16px',
            marginTop: '20px',
            width: '100%'
          }}>
            
            <select
              id="language-select"
              value={sampleFile}
              onChange={(e) => setSampleFile(e.target.value)}
              className="form-select"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '2px',
                border: '2px solid #dfdfdf',
                backgroundColor: 'transparent',
                color: '#000',
                fontSize: '14px',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23718096\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                cursor: 'pointer'
              }}
            >
              <option value="" style={{ color: '#000' }}>Select a file</option>
              <option value="en" style={{ color: '#000' }}>Sample invoice.pdf</option>

            </select>
          </div>
        }
        <button className="submit-btn" onClick={handleSubmit} style={{
          marginTop: useSampleFile ? '10px' : '20px'
        }}
        disabled={loading}>
          {loading ? "Uploading..." : "Submit"}
        </button>
      </div>

        <div className="right-panel">
          <div className='right-child'>
            <div className="steps-block">
              <div
                className={`step ${activeStep === 0 ? "active" : ""} ${activeStep && activeStep > 0 ? "completed" : ""}`}
              >
                <div className="step-number">1</div>
                <div className="step-description">Extracting the data</div>
              </div>
              <div
                className={`step ${activeStep === 1 ? "active" : ""} ${activeStep && activeStep > 1 ? "completed" : ""}`}
              >
                <div className="step-number">2</div>
                <div className="step-description">Approve the extracted data</div>
              </div>
              <div
                className={`step ${activeStep === 2 ? "active" : ""} ${activeStep && activeStep > 2 ? "completed" : ""}`}
              >
                <div className="step-number">3</div>
                <div className="step-description">Generating LEDES file</div>
              </div>
            </div>

            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
              </div>
            ) : (
              <>
                <div className="pdf-table">
                  <h4>Invoice Files</h4>
                  {invoiceData.length === 0 ? (
                    <>
                      <p>No data to display. Upload files to see Invoice.</p>
                      <table>
                        <thead>
                          <tr>
                            <th>File Name</th>
                            <th>Invoice Number</th>
                            <th>Invoice Date</th>
                            <th>Total Amount</th>
                            <th>Company Name</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                      </table>
                    </>
                  ) : (
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>File Name</th>
                            <th>Invoice Number</th>
                            <th>Invoice Date</th>
                            <th>Total Amount</th>
                            <th>Company Name</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceData.map((invoice, index) => (
                            <tr
                              key={index}
                              onClick={() => handlePdfSelect(invoice)}
                              style={{ color: '#000' }}>
                              <td
                                style={{
                                  cursor: "pointer",
                                  color: "#007bff",
                                  textDecoration: "underline",
                                  transition:
                                    "background-color 0.3s ease, color 0.3s ease",
                                }}
                                // onClick={() => handleClick(invoice["File Name"])}
                                onMouseEnter={(e) =>
                                  ((e.currentTarget as HTMLElement).style.backgroundColor = "#f0f0f0")
                                }
                                onMouseLeave={(e) =>
                                  ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                                }
                              >
                                {invoice["File Name"]}
                              </td>

                              <td>{invoice["Invoice Number"]}</td>
                              <td>
                                {invoice.active === "edit" ? (
                                  <input
                                    type="text"
                                    value={invoice["Invoice Date"]}
                                    onChange={(e) =>
                                      handleCheck(
                                        index,
                                        "Invoice Date",
                                        e.target.value,
                                      )
                                    }
                                  />
                                ) : (
                                  invoice["Invoice Date"]
                                )}
                              </td>
                              <td>
                                {invoice.active === "edit" ? (
                                  <input
                                    type="text"
                                    value={invoice["Total Amount"]}
                                    onChange={(e) =>
                                      handleCheck(
                                        index,
                                        "Total Amount",
                                        e.target.value,
                                      )
                                    }
                                  />
                                ) : (
                                  invoice["Total Amount"]
                                )}
                              </td>
                              <td>
                                {invoice.active === "edit" ? (
                                  <input
                                    type="text"
                                    value={invoice["Company Name"]}
                                    onChange={(e) =>
                                      handleCheck(
                                        index,
                                        "Company Name",
                                        e.target.value,
                                      )
                                    }
                                  />
                                ) : (
                                  invoice["Company Name"]
                                )}
                              </td>
                              <td>
                                <div className="action-icons">
                                  {/* <i
                                  className={`fa fa-edit fas ${invoice.active === "edit" ? "active" : ""}`}
                                  onClick={() => {
                                    if (
                                      !isGenerating &&
                                      invoice.active !== "disabled"
                                    ) {
                                      handleActionClick(index, "edit");
                                    }
                                  }}
                                /> */}
                                  <Pencil
                                    className={`w-5 h-5 cursor-pointer ${invoice.active === "edit" ? "text-blue-500" : "text-gray-500"}`}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => {
                                      if (!isGenerating && invoice.active !== "disabled") {
                                        handleActionClick(index, "edit");
                                      }
                                    }}
                                  />
                                  <Check
                                    className={`w-5 h-5 cursor-pointer ${invoice.active === "check" ? "text-green-500" : "text-gray-500"}`}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => {
                                      if (!isGenerating && invoice.active !== "disabled") {
                                        handleActionClick(index, "check");
                                      }
                                    }}
                                  />
                                  <Download
                                    onClick={() => handleGenerateSingle(invoice, index)}
                                    style={{ cursor: "pointer" }}
                                    className={`w-6 h-6 cursor-pointer ${generatingRow === index ? "opacity-50 cursor-not-allowed" : "hover:text-blue-600"
                                      }`}
                                  />
                                  {/* <button
                                  onClick={() => handleGenerateSingle(invoice, index)}
                                  disabled={generatingRow === index} 
                                  className="generate-btn"
                                  
                                >
                                  {generatingRow === index ? (
                                    <span className="spinner"></span> 
                                  ) : (
                                    <div className="tooltip-container">
                                      <span> 
                                      <Download className="w-5 h-5" />
                                      </span>
                                      <span className="tooltip-text">Download LEDES file</span>
                                    </div>
                                  )}
                                </button> */}

                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {invoiceData.length > 0 && (
                    <button
                      className="generate-btn"
                      onClick={handleGenerate}
                      disabled={!isGenerateEnabled || isGenerating}
                    >
                      {isGenerating ? "Generating..." : "Generate"}
                    </button>
                  )}
                </div>

                {/* <div className="pdf-preview"> */}
                {/* PDF and XML Preview Body */}
                <div className="pdf-preview-body">
                  {/* PDF Preview */}
                  <div className="pdf-preview-left">
                    {selectedPdf ? (  /*replace selectedInvoice with selectedPdf */
                      <embed
                        src={URL.createObjectURL(selectedPdf)}
                        type="application/pdf"
                        className="pdf-embed"
                      />
                    ) : (
                      <p className="no-pdf-message">
                        No PDF selected. Please choose an invoice to preview.
                      </p>
                    )}
                  </div>

                  {/* XML Preview */}
                  <div className="pdf-preview-right">
                    <div className="xml-container">
                      {selectedInvoice ? (
                        <pre className="xml-sample">
                          {generateXML(selectedInvoice)}
                        </pre>
                      ) : (
                        <p className="no-xml-message">
                          No XML available. Select an invoice to view its XML.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {/* </div> */}
                {/* {invoiceData.length > 0 && <button className="chatbot-btn" onClick={toggleChat}>
                  Invoice Agent
                </button>} */}
                {/* {invoiceData.length >= 0 && (
                <button className="chatbot-btn" onClick={toggleChat}>
                  <Bot size={24} color="white" />
                  <span className="chatbot-text">Invoice Agent</span>
                </button>
              )} */}
              </>
            )}

          </div>

          {chatVisible && (
            <div className="chat-modal-overlay">
              <div className="chat-modal">
                <button className="chat-close-btn" onClick={toggleChat}>X</button>
                <iframe
                  src="https://copilotstudio.microsoft.com/environments/Default-e4d98dd2-9199-42e5-ba8b-da3e763ede2e/bots/cre88_agentYPqBOs/webchat?__version__=2"
                  // frameborder="0"
                  style={{ width: '100%', height: '100%' }}
                ></iframe>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentIntelligence;
