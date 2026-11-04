import React from "react";
import { Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

const fields = [
  { name: "name", label: "Full Name", type: "text", required: true, placeholder: "e.g. James Whitfield", helpText: { en: "Enter the client's name as you want it shown in records and correspondence.", el: "Γράψτε το όνομα του πελάτη όπως θέλετε να εμφανίζεται στα αρχεία και στην επικοινωνία." } },
  { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], enumContext: "client", helpText: { en: "Choose Active for a current client. Use Inactive when you are no longer providing service.", el: "Επιλέξτε «Ενεργός» για ενεργό πελάτη. Επιλέξτε «Ανενεργός» όταν δεν παρέχετε πλέον υπηρεσίες." } },
  { name: "phone", label: "Phone", type: "text", helpText: { en: "Main phone number, including the country code.", el: "Κύριος αριθμός τηλεφώνου, μαζί με τον διεθνή κωδικό χώρας." } },
  { name: "whatsapp", label: "WhatsApp Number", type: "text", helpText: { en: "WhatsApp number, including the country code. It can be the same as the phone number.", el: "Αριθμός WhatsApp μαζί με τον διεθνή κωδικό χώρας. Μπορεί να είναι ίδιος με τον κύριο αριθμό." } },
  { name: "email", label: "Email", type: "text", helpText: { en: "Email address for reports, invoices, and service updates.", el: "Διεύθυνση email για αναφορές, τιμολόγια και ενημερώσεις υπηρεσιών." } },
  { name: "country", label: "Home Country", type: "text", helpText: { en: "The country where the client lives; this may differ from the property's country.", el: "Η χώρα κατοικίας του πελάτη· μπορεί να διαφέρει από τη χώρα του ακινήτου." } },
  { name: "preferred_language", label: "Preferred Language", type: "select", options: ["English", "Greek"], helpText: { en: "Select the language the client prefers for communication.", el: "Επιλέξτε τη γλώσσα που προτιμά ο πελάτης για την επικοινωνία." } },
  { name: "preferred_communication_method", label: "Preferred Communication", type: "select", options: ["WhatsApp", "Email", "Phone", "SMS"], helpText: { en: "Select the method the client prefers you to use for routine messages.", el: "Επιλέξτε τον τρόπο με τον οποίο προτιμά ο πελάτης να επικοινωνείτε για συνήθη μηνύματα." } },
  { name: "emergency_contact_name", label: "Emergency Contact Name", type: "text", helpText: { en: "Optional: a trusted contact to reach if the client cannot be reached.", el: "Προαιρετικό: έμπιστη επαφή για περίπτωση που δεν μπορείτε να βρείτε τον πελάτη." } },
  { name: "emergency_contact_phone", label: "Emergency Contact Phone", type: "text", helpText: { en: "Optional: emergency contact's phone number, including the country code.", el: "Προαιρετικό: τηλέφωνο της επαφής έκτακτης ανάγκης, μαζί με τον διεθνή κωδικό χώρας." } },
  { name: "billing_address", label: "Billing Address", type: "textarea", helpText: { en: "Full address to use for billing, including postal code and country.", el: "Πλήρης διεύθυνση χρέωσης, μαζί με ταχυδρομικό κώδικα και χώρα." } },
  { name: "tax_invoice_info", label: "Tax / Invoice Information", type: "textarea", helpText: { en: "If an invoice needs tax details, enter the legal billing name and the tax/VAT ID the client provides (Greek AFM/ΑΦΜ, if applicable). Add a tax office only if supplied or requested. Do not guess; leave blank if not applicable.", el: "Αν το τιμολόγιο χρειάζεται φορολογικά στοιχεία, γράψτε την επίσημη επωνυμία και τον φορολογικό αριθμό που δίνει ο πελάτης (ελληνικό ΑΦΜ, αν ισχύει). Προσθέστε ΔΟΥ μόνο αν σας τη δώσει ή ζητηθεί. Μην μαντεύετε· αφήστε το κενό αν δεν εφαρμόζεται." } },
  { name: "special_instructions", label: "Special Instructions", type: "textarea", helpText: { en: "Practical preferences or instructions for caring for this client's property.", el: "Πρακτικές προτιμήσεις ή οδηγίες για τη φροντίδα του ακινήτου του πελάτη." } },
  { name: "notes", label: "Notes", type: "textarea", helpText: { en: "Internal notes for your team. Avoid storing passwords, bank details, or other sensitive information here.", el: "Εσωτερικές σημειώσεις για την ομάδα σας. Μην αποθηκεύετε εδώ κωδικούς, τραπεζικά στοιχεία ή άλλες ευαίσθητες πληροφορίες." } },
];

const columns = [
  { key: "name", label: "Client", primary: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "country", label: "Country" },
  { key: "preferred_communication_method", label: "Contact", badge: true },
  { key: "status", label: "Status", badge: true },
];

export default function Clients() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const returnTo = params.get("returnTo");
  return (
    <AppLayout>
      <ResourceListPage
        entityName="Client"
        title="Clients"
        subtitle="Property owners and contacts"
        icon={Users}
        fields={fields}
        columns={columns}
        searchKeys={["name", "email", "phone", "country", "whatsapp"]}
        addItemLabel="Add Client"
        archivable
        defaultValues={{ status: "Active", preferred_language: "English", preferred_communication_method: "WhatsApp" }}
        onCreated={(_, created) => {
          navigate(`/properties?add=1&owner=${created.id}`);
          return false;
        }}
        onOpenItem={(item) => navigate(`/clients/${item.id}`)}
        autoOpenEditId={editId || undefined}
        focusFieldName={params.get("focus") || undefined}
        onSaved={() => { if (returnTo) navigate(returnTo); }}
        onCancel={() => { if (returnTo) navigate(returnTo); }}
      />
    </AppLayout>
  );
}
