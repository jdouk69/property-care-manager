// Report-only wording. Never writes fabricated notes into visit records.
// Only Normal results receive positive wording. Exact canonical names only.
const RESULTS = {
  "Close windows and shutters": [
    "Windows and shutters were closed for departure; no visible issues were noted.",
    "Τα παράθυρα και τα παντζούρια έκλεισαν για την αναχώρηση· δεν παρατηρήθηκαν ορατά προβλήματα."
  ],
  "Close shutters": [
    "Windows and shutters were closed for departure; no visible issues were noted.",
    "Τα παράθυρα και τα παντζούρια έκλεισαν για την αναχώρηση· δεν παρατηρήθηκαν ορατά προβλήματα."
  ],
  "Turn off selected utilities": [
    "The utilities selected for shutdown were turned off according to the departure checklist.",
    "Οι επιλεγμένες παροχές απενεργοποιήθηκαν σύμφωνα με τη λίστα αναχώρησης."
  ],
  "Check air conditioning": [
    "Air conditioning was checked, with no issues noted during the visit.",
    "Ο κλιματισμός ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Air conditioning": [
    "Air conditioning was checked, with no issues noted during the visit.",
    "Ο κλιματισμός ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Air conditioning / heating": [
    "Air conditioning was checked, with no issues noted during the visit.",
    "Ο κλιματισμός ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Remove rubbish": [
    "Rubbish was removed from the property.",
    "Τα απορρίμματα απομακρύνθηκαν από το ακίνητο."
  ],
  "Check refrigerator": [
    "The refrigerator was checked, with no issues noted during the visit.",
    "Το ψυγείο ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Confirm cleaning": [
    "Cleaning was checked and confirmed for this visit.",
    "Ο καθαρισμός ελέγχθηκε και επιβεβαιώθηκε για αυτή την επίσκεψη."
  ],
  "Inspect for damage": [
    "No visible damage was observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές ζημιές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Look for obvious damage or vandalism": [
    "No visible damage was observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές ζημιές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Look for obvious damage/vandalism": [
    "No visible damage was observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές ζημιές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Damage/vandalism observations": [
    "No visible damage was observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές ζημιές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Storm damage": [
    "No visible damage was observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές ζημιές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Roof / visible exterior damage": [
    "No visible damage was observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές ζημιές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Secure doors and gates": [
    "Doors and gates were secured before departure.",
    "Οι πόρτες και οι πύλες ασφαλίστηκαν πριν την αναχώρηση."
  ],
  "Lock all doors and gates": [
    "Doors and gates were secured before departure.",
    "Οι πόρτες και οι πύλες ασφαλίστηκαν πριν την αναχώρηση."
  ],
  "Doors/gates/windows visibly secure": [
    "The property was checked and appeared visibly secure before departure.",
    "Το ακίνητο ελέγχθηκε και φαινόταν ασφαλισμένο πριν την αναχώρηση."
  ],
  "Confirm property is secured before leaving": [
    "The property was checked and appeared visibly secure before departure.",
    "Το ακίνητο ελέγχθηκε και φαινόταν ασφαλισμένο πριν την αναχώρηση."
  ],
  "Check alarm": [
    "The security system was checked, with no issues noted; this does not certify its performance.",
    "Το σύστημα ασφαλείας ελέγχθηκε χωρίς να σημειωθούν προβλήματα· αυτό δεν αποτελεί πιστοποίηση της απόδοσής του."
  ],
  "Security system": [
    "The security system was checked, with no issues noted; this does not certify its performance.",
    "Το σύστημα ασφαλείας ελέγχθηκε χωρίς να σημειωθούν προβλήματα· αυτό δεν αποτελεί πιστοποίηση της απόδοσής του."
  ],
  "Security systems": [
    "The security system was checked, with no issues noted; this does not certify its performance.",
    "Το σύστημα ασφαλείας ελέγχθηκε χωρίς να σημειωθούν προβλήματα· αυτό δεν αποτελεί πιστοποίηση της απόδοσής του."
  ],
  "Record keys": [
    "The keys were checked and accounted for according to the visit checklist.",
    "Τα κλειδιά ελέγχθηκαν σύμφωνα με τη λίστα της επίσκεψης."
  ],
  "Confirm keys": [
    "The keys were checked and accounted for according to the visit checklist.",
    "Τα κλειδιά ελέγχθηκαν σύμφωνα με τη λίστα της επίσκεψης."
  ],
  "Take final photos": [
    "Photo documentation for this checklist item was marked complete.",
    "Η φωτογραφική τεκμηρίωση για αυτό το στοιχείο σημειώθηκε ως ολοκληρωμένη."
  ],
  "Final photo": [
    "Photo documentation for this checklist item was marked complete.",
    "Η φωτογραφική τεκμηρίωση για αυτό το στοιχείο σημειώθηκε ως ολοκληρωμένη."
  ],
  "Routine property photos": [
    "Photo documentation for this checklist item was marked complete.",
    "Η φωτογραφική τεκμηρίωση για αυτό το στοιχείο σημειώθηκε ως ολοκληρωμένη."
  ],
  "More detailed photo documentation": [
    "Photo documentation for this checklist item was marked complete.",
    "Η φωτογραφική τεκμηρίωση για αυτό το στοιχείο σημειώθηκε ως ολοκληρωμένη."
  ],
  "Take documentation photos": [
    "Photo documentation for this checklist item was marked complete.",
    "Η φωτογραφική τεκμηρίωση για αυτό το στοιχείο σημειώθηκε ως ολοκληρωμένη."
  ],
  "Photos / documentation": [
    "Photo documentation for this checklist item was marked complete.",
    "Η φωτογραφική τεκμηρίωση για αυτό το στοιχείο σημειώθηκε ως ολοκληρωμένη."
  ],
  "Photos of progress": [
    "Photo documentation for this checklist item was marked complete.",
    "Η φωτογραφική τεκμηρίωση για αυτό το στοιχείο σημειώθηκε ως ολοκληρωμένη."
  ],
  "Capture the dated photo update for the owner (1–3 photos)": [
    "Photo documentation for this checklist item was marked complete.",
    "Η φωτογραφική τεκμηρίωση για αυτό το στοιχείο σημειώθηκε ως ολοκληρωμένη."
  ],
  "Check property after departure": [
    "The visual walkthrough was completed, with no concerns noted in the accessible areas checked.",
    "Ο οπτικός έλεγχος ολοκληρώθηκε χωρίς να σημειωθούν ζητήματα στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Quick exterior walk-around": [
    "The visual walkthrough was completed, with no concerns noted in the accessible areas checked.",
    "Ο οπτικός έλεγχος ολοκληρώθηκε χωρίς να σημειωθούν ζητήματα στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Quick interior walk-through": [
    "The visual walkthrough was completed, with no concerns noted in the accessible areas checked.",
    "Ο οπτικός έλεγχος ολοκληρώθηκε χωρίς να σημειωθούν ζητήματα στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "More complete exterior visual check": [
    "The visual walkthrough was completed, with no concerns noted in the accessible areas checked.",
    "Ο οπτικός έλεγχος ολοκληρώθηκε χωρίς να σημειωθούν ζητήματα στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "More complete interior visual walk-through": [
    "The visual walkthrough was completed, with no concerns noted in the accessible areas checked.",
    "Ο οπτικός έλεγχος ολοκληρώθηκε χωρίς να σημειωθούν ζητήματα στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "More detailed exterior visual review": [
    "The visual walkthrough was completed, with no concerns noted in the accessible areas checked.",
    "Ο οπτικός έλεγχος ολοκληρώθηκε χωρίς να σημειωθούν ζητήματα στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "More detailed interior visual review": [
    "The visual walkthrough was completed, with no concerns noted in the accessible areas checked.",
    "Ο οπτικός έλεγχος ολοκληρώθηκε χωρίς να σημειωθούν ζητήματα στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Complete a visual walkthrough of the property (exterior and interior)": [
    "The visual walkthrough was completed, with no concerns noted in the accessible areas checked.",
    "Ο οπτικός έλεγχος ολοκληρώθηκε χωρίς να σημειωθούν ζητήματα στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Water leaks": [
    "No visible leaks were observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές διαρροές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Look for obvious visible water/leaks": [
    "No visible leaks were observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές διαρροές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Look for visible water/leaks": [
    "No visible leaks were observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές διαρροές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Visible water/leak observations": [
    "No visible leaks were observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές διαρροές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Visible leaks / plumbing concerns": [
    "No visible leaks were observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές διαρροές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Visual checks under accessible sinks for obvious leaks": [
    "No visible leaks were observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές διαρροές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Visual checks under accessible sinks": [
    "No visible leaks were observed in the accessible areas checked.",
    "Δεν παρατηρήθηκαν ορατές διαρροές στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Humidity": [
    "No visible moisture or related concerns were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια υγρασίας ή σχετικά ζητήματα στους χώρους που ελέγχθηκαν."
  ],
  "Mold": [
    "No visible moisture or related concerns were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια υγρασίας ή σχετικά ζητήματα στους χώρους που ελέγχθηκαν."
  ],
  "Humidity / dampness": [
    "No visible moisture or related concerns were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια υγρασίας ή σχετικά ζητήματα στους χώρους που ελέγχθηκαν."
  ],
  "Mold / odors": [
    "No visible moisture or related concerns were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια υγρασίας ή σχετικά ζητήματα στους χώρους που ελέγχθηκαν."
  ],
  "Visible moisture/mold observations": [
    "No visible moisture or related concerns were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια υγρασίας ή σχετικά ζητήματα στους χώρους που ελέγχθηκαν."
  ],
  "Observe obvious moisture/water intrusion encountered during walk-through": [
    "No visible moisture or related concerns were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια υγρασίας ή σχετικά ζητήματα στους χώρους που ελέγχθηκαν."
  ],
  "Look for obvious visible water/leaks or moisture": [
    "No visible moisture or related concerns were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια υγρασίας ή σχετικά ζητήματα στους χώρους που ελέγχθηκαν."
  ],
  "Insects or pests": [
    "No visible signs of pest activity were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια δραστηριότητας παρασίτων στους χώρους που ελέγχθηκαν."
  ],
  "Pest activity": [
    "No visible signs of pest activity were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια δραστηριότητας παρασίτων στους χώρους που ελέγχθηκαν."
  ],
  "Look for obvious pest activity": [
    "No visible signs of pest activity were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια δραστηριότητας παρασίτων στους χώρους που ελέγχθηκαν."
  ],
  "Look for pest concerns/signs": [
    "No visible signs of pest activity were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια δραστηριότητας παρασίτων στους χώρους που ελέγχθηκαν."
  ],
  "Pest concerns/signs": [
    "No visible signs of pest activity were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια δραστηριότητας παρασίτων στους χώρους που ελέγχθηκαν."
  ],
  "Signs of forced entry": [
    "No visible signs of forced entry were noted in the areas checked.",
    "Δεν σημειώθηκαν ορατά σημάδια παραβίασης στους χώρους που ελέγχθηκαν."
  ],
  "Electrical supply": [
    "Electricity appeared available where reasonably observable during the visit.",
    "Η παροχή ρεύματος φαινόταν διαθέσιμη όπου ήταν εύλογα παρατηρήσιμη κατά την επίσκεψη."
  ],
  "Electrical power": [
    "Electricity appeared available where reasonably observable during the visit.",
    "Η παροχή ρεύματος φαινόταν διαθέσιμη όπου ήταν εύλογα παρατηρήσιμη κατά την επίσκεψη."
  ],
  "Electrical supply appears on": [
    "Electricity appeared available where reasonably observable during the visit.",
    "Η παροχή ρεύματος φαινόταν διαθέσιμη όπου ήταν εύλογα παρατηρήσιμη κατά την επίσκεψη."
  ],
  "Confirm electricity appears available where reasonably observable": [
    "Electricity appeared available where reasonably observable during the visit.",
    "Η παροχή ρεύματος φαινόταν διαθέσιμη όπου ήταν εύλογα παρατηρήσιμη κατά την επίσκεψη."
  ],
  "Electricity appears available where reasonably observable": [
    "Electricity appeared available where reasonably observable during the visit.",
    "Η παροχή ρεύματος φαινόταν διαθέσιμη όπου ήταν εύλογα παρατηρήσιμη κατά την επίσκεψη."
  ],
  "Pool water level": [
    "The visible pool condition was checked, with no concerns noted during the visit.",
    "Η ορατή κατάσταση της πισίνας ελέγχθηκε χωρίς να σημειωθούν ζητήματα κατά την επίσκεψη."
  ],
  "Pool clarity": [
    "The visible pool condition was checked, with no concerns noted during the visit.",
    "Η ορατή κατάσταση της πισίνας ελέγχθηκε χωρίς να σημειωθούν ζητήματα κατά την επίσκεψη."
  ],
  "Pool condition": [
    "The visible pool condition was checked, with no concerns noted during the visit.",
    "Η ορατή κατάσταση της πισίνας ελέγχθηκε χωρίς να σημειωθούν ζητήματα κατά την επίσκεψη."
  ],
  "Pool visible condition / water level": [
    "The visible pool condition was checked, with no concerns noted during the visit.",
    "Η ορατή κατάσταση της πισίνας ελέγχθηκε χωρίς να σημειωθούν ζητήματα κατά την επίσκεψη."
  ],
  "Check pool": [
    "The visible pool condition was checked, with no concerns noted during the visit.",
    "Η ορατή κατάσταση της πισίνας ελέγχθηκε χωρίς να σημειωθούν ζητήματα κατά την επίσκεψη."
  ],
  "Quick visual check of pool condition where applicable": [
    "The visible pool condition was checked, with no concerns noted during the visit.",
    "Η ορατή κατάσταση της πισίνας ελέγχθηκε χωρίς να σημειωθούν ζητήματα κατά την επίσκεψη."
  ],
  "Pool visual condition where applicable": [
    "The visible pool condition was checked, with no concerns noted during the visit.",
    "Η ορατή κατάσταση της πισίνας ελέγχθηκε χωρίς να σημειωθούν ζητήματα κατά την επίσκεψη."
  ],
  "Detailed pool visual condition where applicable": [
    "The visible pool condition was checked, with no concerns noted during the visit.",
    "Η ορατή κατάσταση της πισίνας ελέγχθηκε χωρίς να σημειωθούν ζητήματα κατά την επίσκεψη."
  ],
  "Pool equipment": [
    "The accessible pool equipment was visually checked, with no visible concerns noted.",
    "Ο προσβάσιμος εξοπλισμός της πισίνας ελέγχθηκε οπτικά χωρίς να σημειωθούν ορατά ζητήματα."
  ],
  "Visually observe pool equipment condition": [
    "The accessible pool equipment was visually checked, with no visible concerns noted.",
    "Ο προσβάσιμος εξοπλισμός της πισίνας ελέγχθηκε οπτικά χωρίς να σημειωθούν ορατά ζητήματα."
  ],
  "Quick visual check of grounds/balconies": [
    "The accessible grounds and outdoor areas were visually checked, with no concerns noted.",
    "Οι προσβάσιμοι εξωτερικοί χώροι ελέγχθηκαν οπτικά χωρίς να σημειωθούν ζητήματα."
  ],
  "Grounds/balconies visual condition": [
    "The accessible grounds and outdoor areas were visually checked, with no concerns noted.",
    "Οι προσβάσιμοι εξωτερικοί χώροι ελέγχθηκαν οπτικά χωρίς να σημειωθούν ζητήματα."
  ],
  "Detailed grounds/balcony visual condition": [
    "The accessible grounds and outdoor areas were visually checked, with no concerns noted.",
    "Οι προσβάσιμοι εξωτερικοί χώροι ελέγχθηκαν οπτικά χωρίς να σημειωθούν ζητήματα."
  ],
  "Check garden": [
    "The accessible grounds and outdoor areas were visually checked, with no concerns noted.",
    "Οι προσβάσιμοι εξωτερικοί χώροι ελέγχθηκαν οπτικά χωρίς να σημειωθούν ζητήματα."
  ],
  "Garden condition": [
    "The accessible grounds and outdoor areas were visually checked, with no concerns noted.",
    "Οι προσβάσιμοι εξωτερικοί χώροι ελέγχθηκαν οπτικά χωρίς να σημειωθούν ζητήματα."
  ],
  "Garden / landscaping": [
    "The accessible grounds and outdoor areas were visually checked, with no concerns noted.",
    "Οι προσβάσιμοι εξωτερικοί χώροι ελέγχθηκαν οπτικά χωρίς να σημειωθούν ζητήματα."
  ],
  "Open and air out property": [
    "The property was opened and aired as appropriate for this visit.",
    "Το ακίνητο ανοίχτηκε και αερίστηκε όπως απαιτούσε η επίσκεψη."
  ],
  "Air the property as appropriate": [
    "The property was opened and aired as appropriate for this visit.",
    "Το ακίνητο ανοίχτηκε και αερίστηκε όπως απαιτούσε η επίσκεψη."
  ],
  "Turn on electricity": [
    "Electricity was turned on according to the arrival checklist.",
    "Το ρεύμα ενεργοποιήθηκε σύμφωνα με τη λίστα άφιξης."
  ],
  "Turn on water": [
    "The water supply was turned on according to the arrival checklist.",
    "Η παροχή νερού ανοίχτηκε σύμφωνα με τη λίστα άφιξης."
  ],
  "Turn on hot water": [
    "Hot water was turned on according to the arrival checklist.",
    "Το ζεστό νερό ενεργοποιήθηκε σύμφωνα με τη λίστα άφιξης."
  ],
  "Start air conditioning": [
    "The selected air conditioning units were operated as agreed, with no issues noted.",
    "Οι επιλεγμένες μονάδες κλιματισμού λειτούργησαν όπως συμφωνήθηκε χωρίς να σημειωθούν προβλήματα."
  ],
  "Briefly operate agreed AC units": [
    "The selected air conditioning units were operated as agreed, with no issues noted.",
    "Οι επιλεγμένες μονάδες κλιματισμού λειτούργησαν όπως συμφωνήθηκε χωρίς να σημειωθούν προβλήματα."
  ],
  "Test lights": [
    "The selected lights were operated, with no issues noted.",
    "Ο επιλεγμένος φωτισμός δοκιμάστηκε χωρίς να σημειωθούν προβλήματα."
  ],
  "Operate selected lights": [
    "The selected lights were operated, with no issues noted.",
    "Ο επιλεγμένος φωτισμός δοκιμάστηκε χωρίς να σημειωθούν προβλήματα."
  ],
  "Run agreed/selected faucets": [
    "The agreed faucets were run, with no issues noted during this brief check.",
    "Οι συμφωνημένες βρύσες λειτούργησαν χωρίς να σημειωθούν προβλήματα στον σύντομο έλεγχο."
  ],
  "Flush agreed/selected toilets": [
    "The agreed toilets were flushed, with no issues noted during this check.",
    "Οι συμφωνημένες τουαλέτες δοκιμάστηκαν χωρίς να σημειωθούν προβλήματα στον έλεγχο."
  ],
  "Check whether agreed refrigerator/freezer or other agreed appliances appear to operate": [
    "The agreed appliances appeared to operate during the visit; no issues were noted during this check.",
    "Οι συμφωνημένες συσκευές φαίνονταν να λειτουργούν κατά την επίσκεψη χωρίς να σημειωθούν προβλήματα στον έλεγχο."
  ],
  "Check Wi-Fi": [
    "The internet connection was checked, with no issues noted during the visit.",
    "Η σύνδεση στο διαδίκτυο ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Internet": [
    "The internet connection was checked, with no issues noted during the visit.",
    "Η σύνδεση στο διαδίκτυο ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Prepare linens": [
    "Linens were prepared according to the arrival checklist.",
    "Τα λευκά είδη προετοιμάστηκαν σύμφωνα με τη λίστα άφιξης."
  ],
  "Place welcome items": [
    "Welcome items were placed according to the arrival checklist.",
    "Τα είδη υποδοχής τοποθετήθηκαν σύμφωνα με τη λίστα άφιξης."
  ],
  "Recheck previously identified concerns": [
    "The agreed monitoring items were reviewed; no new concerns were noted in this check.",
    "Τα συμφωνημένα σημεία παρακολούθησης εξετάστηκαν· δεν σημειώθηκαν νέα ζητήματα σε αυτόν τον έλεγχο."
  ],
  "Track unresolved concerns": [
    "The agreed monitoring items were reviewed; no new concerns were noted in this check.",
    "Τα συμφωνημένα σημεία παρακολούθησης εξετάστηκαν· δεν σημειώθηκαν νέα ζητήματα σε αυτόν τον έλεγχο."
  ],
  "Owner-selected monitoring priorities": [
    "The agreed monitoring items were reviewed; no new concerns were noted in this check.",
    "Τα συμφωνημένα σημεία παρακολούθησης εξετάστηκαν· δεν σημειώθηκαν νέα ζητήματα σε αυτόν τον έλεγχο."
  ],
  "Expanded owner-selected monitoring priorities": [
    "The agreed monitoring items were reviewed; no new concerns were noted in this check.",
    "Τα συμφωνημένα σημεία παρακολούθησης εξετάστηκαν· δεν σημειώθηκαν νέα ζητήματα σε αυτόν τον έλεγχο."
  ],
  "Notify owner if a concerning problem is discovered": [
    "The owner-notification requirement was reviewed and marked complete where applicable.",
    "Η απαίτηση ενημέρωσης του ιδιοκτήτη εξετάστηκε και σημειώθηκε ως ολοκληρωμένη όπου απαιτούνταν."
  ],
  "Owner notification when necessary": [
    "The owner-notification requirement was reviewed and marked complete where applicable.",
    "Η απαίτηση ενημέρωσης του ιδιοκτήτη εξετάστηκε και σημειώθηκε ως ολοκληρωμένη όπου απαιτούνταν."
  ],
  "Owner update required": [
    "The owner-notification requirement was reviewed and marked complete where applicable.",
    "Η απαίτηση ενημέρωσης του ιδιοκτήτη εξετάστηκε και σημειώθηκε ως ολοκληρωμένη όπου απαιτούνταν."
  ],
  "Take photos of a PROBLEM when a problem is discovered": [
    "The concern-documentation requirement was reviewed and marked complete where applicable.",
    "Η απαίτηση τεκμηρίωσης ζητημάτων εξετάστηκε και σημειώθηκε ως ολοκληρωμένη όπου απαιτούνταν."
  ],
  "Problem photographs when applicable": [
    "The concern-documentation requirement was reviewed and marked complete where applicable.",
    "Η απαίτηση τεκμηρίωσης ζητημάτων εξετάστηκε και σημειώθηκε ως ολοκληρωμένη όπου απαιτούνταν."
  ],
  "Documentation of concerns": [
    "The concern-documentation requirement was reviewed and marked complete where applicable.",
    "Η απαίτηση τεκμηρίωσης ζητημάτων εξετάστηκε και σημειώθηκε ως ολοκληρωμένη όπου απαιτούνταν."
  ],
  "Written visit report": [
    "The visit documentation checklist item was marked complete.",
    "Το στοιχείο τεκμηρίωσης της επίσκεψης σημειώθηκε ως ολοκληρωμένο."
  ],
  "Detailed written visit report": [
    "The visit documentation checklist item was marked complete.",
    "Το στοιχείο τεκμηρίωσης της επίσκεψης σημειώθηκε ως ολοκληρωμένο."
  ],
  "Complete the visit record with notes and photos for the owner": [
    "The visit documentation checklist item was marked complete.",
    "Το στοιχείο τεκμηρίωσης της επίσκεψης σημειώθηκε ως ολοκληρωμένο."
  ],
  "Gates": [
    "Gates: checked, with no issues noted during the visit.",
    "Πύλες: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Fences": [
    "Fences: checked, with no issues noted during the visit.",
    "Φράχτες: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Doors": [
    "Doors: checked, with no issues noted during the visit.",
    "Πόρτες: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Windows": [
    "Windows: checked, with no issues noted during the visit.",
    "Παράθυρα: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Shutters": [
    "Shutters: checked, with no issues noted during the visit.",
    "Παντζούρια: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Roof": [
    "Roof: checked, with no issues noted during the visit.",
    "Σκεπή: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Balconies": [
    "Balconies: checked, with no issues noted during the visit.",
    "Μπαλκόνια: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Exterior walls": [
    "Exterior walls: checked, with no issues noted during the visit.",
    "Εξωτερικοί τοίχοι: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Drainage": [
    "Drainage: checked, with no issues noted during the visit.",
    "Απορροή νερού: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Lights": [
    "Lights: checked, with no issues noted during the visit.",
    "Φωτισμός: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Heating": [
    "Heating: checked, with no issues noted during the visit.",
    "Θέρμανση: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Appliances": [
    "Appliances: checked, with no issues noted during the visit.",
    "Συσκευές: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Cleanliness": [
    "Cleanliness: checked, with no issues noted during the visit.",
    "Καθαριότητα: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "General condition": [
    "General condition: checked, with no issues noted during the visit.",
    "Γενική κατάσταση: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Irrigation": [
    "Irrigation: checked, with no issues noted during the visit.",
    "Άρδευση: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Outdoor lighting": [
    "Outdoor lighting: checked, with no issues noted during the visit.",
    "Εξωτερικός φωτισμός: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Water pressure": [
    "Water pressure: checked, with no issues noted during the visit.",
    "Πίεση νερού: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Hot water": [
    "Hot water: checked, with no issues noted during the visit.",
    "Ζεστό νερό: ελέγχθηκε χωρίς να σημειωθούν προβλήματα κατά την επίσκεψη."
  ],
  "Unusual odors": [
    "No unusual odors were noted in the areas checked.",
    "Δεν σημειώθηκαν ασυνήθιστες οσμές στους χώρους που ελέγχθηκαν."
  ],
  "Electricity meter": [
    "The meter-reading check was completed; any recorded readings are shown in the visit record.",
    "Ο έλεγχος του μετρητή ολοκληρώθηκε· τυχόν καταγεγραμμένες ενδείξεις εμφανίζονται στην εγγραφή της επίσκεψης."
  ],
  "Water meter": [
    "The meter-reading check was completed; any recorded readings are shown in the visit record.",
    "Ο έλεγχος του μετρητή ολοκληρώθηκε· τυχόν καταγεγραμμένες ενδείξεις εμφανίζονται στην εγγραφή της επίσκεψης."
  ],
  "Inspect bathrooms": [
    "The accessible bathrooms were visually checked, with no concerns noted.",
    "Τα προσβάσιμα μπάνια ελέγχθηκαν οπτικά χωρίς να σημειωθούν ζητήματα."
  ],
  "Inspect bedrooms": [
    "The accessible bedrooms were visually checked, with no concerns noted.",
    "Τα προσβάσιμα υπνοδωμάτια ελέγχθηκαν οπτικά χωρίς να σημειωθούν ζητήματα."
  ],
  "Carry out the property-specific opening steps approved by the owner in advance (recorded on this visit's owner approval)": [
    "The opening steps approved in advance by the owner were marked complete.",
    "Τα βήματα ανοίγματος που είχε εγκρίνει ο ιδιοκτήτης σημειώθηκαν ως ολοκληρωμένα."
  ],
  "Carry out the property-specific closing steps approved by the owner in advance (recorded on this visit's owner approval)": [
    "The closing steps approved in advance by the owner were marked complete.",
    "Τα βήματα κλεισίματος που είχε εγκρίνει ο ιδιοκτήτης σημειώθηκαν ως ολοκληρωμένα."
  ],
  "Operate simple controls (opening/shutting windows and shutters, airing) only where the owner's recorded instructions are clear": [
    "Simple controls were handled according to the owner’s recorded instructions where applicable.",
    "Οι απλοί χειρισμοί πραγματοποιήθηκαν σύμφωνα με τις καταγεγραμμένες οδηγίες του ιδιοκτήτη όπου απαιτούνταν."
  ],
  "Operate simple controls (opening/shutting windows and shutters) only where the owner's recorded instructions are clear": [
    "Simple controls were handled according to the owner’s recorded instructions where applicable.",
    "Οι απλοί χειρισμοί πραγματοποιήθηκαν σύμφωνα με τις καταγεγραμμένες οδηγίες του ιδιοκτήτη όπου απαιτούνταν."
  ],
  "Stop any unclear or apparently problematic step, document what is seen, and ask the owner how to proceed": [
    "The stop-and-ask requirement for unclear or problematic steps was reviewed and marked complete where applicable.",
    "Η απαίτηση διακοπής και ερώτησης για ασαφή ή προβληματικά βήματα εξετάστηκε και σημειώθηκε ως ολοκληρωμένη όπου απαιτούνταν."
  ],
  "Look for obvious visible problems: leaks or water issues, moisture, damage, or anything unusual after the period away": [
    "No obvious visible problems were noted in the accessible areas checked.",
    "Δεν σημειώθηκαν εμφανή ορατά προβλήματα στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Look for obvious visible problems: damage, leaks or water issues, or anything unusual": [
    "No obvious visible problems were noted in the accessible areas checked.",
    "Δεν σημειώθηκαν εμφανή ορατά προβλήματα στους προσβάσιμους χώρους που ελέγχθηκαν."
  ],
  "Check that doors, shutters and gates are as the owner instructed": [
    "The property-security steps were completed according to the owner’s instructions.",
    "Τα βήματα ασφάλισης του ακινήτου ολοκληρώθηκαν σύμφωνα με τις οδηγίες του ιδιοκτήτη."
  ],
  "Secure the property as the owner has instructed": [
    "The property-security steps were completed according to the owner’s instructions.",
    "Τα βήματα ασφάλισης του ακινήτου ολοκληρώθηκαν σύμφωνα με τις οδηγίες του ιδιοκτήτη."
  ],
  "Check that doors, windows and shutters are closed and in visible good condition": [
    "Doors, windows and shutters were checked as closed, with no visible issues noted.",
    "Οι πόρτες, τα παράθυρα και τα παντζούρια ελέγχθηκαν ως κλειστά χωρίς να σημειωθούν ορατά προβλήματα."
  ],
  "Utility systems (water, electricity, pool, water heater, alarms): act only on the owner's recorded property-specific instructions — otherwise flag for the owner or an appropriate provider; never start or adjust automatically": [
    "The utility-instructions requirement was reviewed and marked complete; no system operation beyond the owner’s instructions is implied.",
    "Η απαίτηση οδηγιών για τις παροχές εξετάστηκε και σημειώθηκε ως ολοκληρωμένη· δεν υπονοείται λειτουργία πέρα από τις οδηγίες του ιδιοκτήτη."
  ],
  "Return or store keys according to the owner's recorded key instructions for this visit": [
    "Keys were returned or stored according to the owner’s recorded instructions for this visit.",
    "Τα κλειδιά επιστράφηκαν ή φυλάχθηκαν σύμφωνα με τις καταγεγραμμένες οδηγίες του ιδιοκτήτη."
  ],
  "Record arrival time and site access": [
    "Arrival time and site access were recorded for this visit.",
    "Η ώρα άφιξης και η πρόσβαση στον χώρο καταγράφηκαν για αυτή την επίσκεψη."
  ],
  "Record departure time": [
    "Departure time was recorded for this visit.",
    "Η ώρα αναχώρησης καταγράφηκε για αυτή την επίσκεψη."
  ],
  "Contractors present": [
    "Contractors present: reviewed during the site visit, with no concerns recorded for this item.",
    "Παρόντες εργολάβοι: εξετάστηκε κατά την επίσκεψη χωρίς να καταγραφούν ζητήματα για αυτό το στοιχείο."
  ],
  "Materials delivered": [
    "Materials delivered: reviewed during the site visit, with no concerns recorded for this item.",
    "Παραδομένα υλικά: εξετάστηκε κατά την επίσκεψη χωρίς να καταγραφούν ζητήματα για αυτό το στοιχείο."
  ],
  "Work expected": [
    "Work expected: reviewed during the site visit, with no concerns recorded for this item.",
    "Αναμενόμενες εργασίες: εξετάστηκε κατά την επίσκεψη χωρίς να καταγραφούν ζητήματα για αυτό το στοιχείο."
  ],
  "Work observed": [
    "Work observed: reviewed during the site visit, with no concerns recorded for this item.",
    "Παρατηρούμενες εργασίες: εξετάστηκε κατά την επίσκεψη χωρίς να καταγραφούν ζητήματα για αυτό το στοιχείο."
  ],
  "Workmanship concerns": [
    "Workmanship concerns: reviewed during the site visit, with no concerns recorded for this item.",
    "Ζητήματα ποιότητας εργασιών: εξετάστηκε κατά την επίσκεψη χωρίς να καταγραφούν ζητήματα για αυτό το στοιχείο."
  ],
  "Incomplete work": [
    "Incomplete work: reviewed during the site visit, with no concerns recorded for this item.",
    "Ημιτελείς εργασίες: εξετάστηκε κατά την επίσκεψη χωρίς να καταγραφούν ζητήματα για αυτό το στοιχείο."
  ],
  "Questions for owner decision": [
    "Questions for owner decision: reviewed during the site visit, with no concerns recorded for this item.",
    "Θέματα προς απόφαση ιδιοκτήτη: εξετάστηκε κατά την επίσκεψη χωρίς να καταγραφούν ζητήματα για αυτό το στοιχείο."
  ],
  "Give priority attention/assistance to identified concerns": [
    "The priority-assistance requirement was reviewed and marked complete where applicable.",
    "Η απαίτηση βοήθειας κατά προτεραιότητα εξετάστηκε και σημειώθηκε ως ολοκληρωμένη όπου απαιτούνταν."
  ],
  "Confirm owner shopping list and budget": [
    "The owner’s shopping list and budget were confirmed.",
    "Η λίστα αγορών και ο προϋπολογισμός του ιδιοκτήτη επιβεβαιώθηκαν."
  ],
  "Purchase requested groceries": [
    "The requested groceries were purchased according to the agreed shopping list.",
    "Τα ζητηθέντα είδη αγοράστηκαν σύμφωνα με τη συμφωνημένη λίστα."
  ],
  "Deliver groceries to the property": [
    "The purchased groceries were delivered to the property.",
    "Τα αγορασμένα είδη παραδόθηκαν στο ακίνητο."
  ],
  "Put away / stock basics": [
    "The groceries were put away according to the stocking checklist.",
    "Τα είδη τακτοποιήθηκαν σύμφωνα με τη λίστα ανεφοδιασμού."
  ],
  "Record grocery cost and attach receipt photo": [
    "Recording the grocery cost and receipt documentation was marked complete.",
    "Η καταγραφή κόστους αγορών και η τεκμηρίωση απόδειξης σημειώθηκαν ως ολοκληρωμένες."
  ],
  "Send owner update with photos": [
    "The owner update with photos was marked complete.",
    "Η ενημέρωση του ιδιοκτήτη με φωτογραφίες σημειώθηκε ως ολοκληρωμένη."
  ]
};
export function checklistReportResult(name, status, lang = "en", displayName = name) {
  if (status !== "Normal") return "";
  const wording = RESULTS[name];
  if (wording) return wording[lang === "el" ? 1 : 0];
  return lang === "el"
    ? `${displayName}: ο έλεγχος σημειώθηκε ως ολοκληρωμένος χωρίς να καταγραφούν ζητήματα.`
    : `${displayName}: the check was marked complete, with no concerns recorded.`;
}
