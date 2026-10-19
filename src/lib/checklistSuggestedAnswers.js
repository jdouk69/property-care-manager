import { EMERGENCY_SUGGESTED_ANSWERS, suggestedAnswers as emergencyAnswers } from './emergencySuggestedAnswers.js';
export { applySuggestedAnswer } from './emergencySuggestedAnswers.js';

// Exact, reviewed question aliases only. An unfamiliar/custom item receives
// Custom, never a guessed observation or automatically generated assurance.
const registry = Object.create(null);
const o = (label, text) => ({ label, text });
function add(names, normal, concern, unable) {
 const set = { normal, concern, unable };
 for (const name of names) {
  if (Object.hasOwn(registry, name)) throw new Error(`Duplicate description mapping: ${name}`);
  registry[name] = set;
 }
}
add(['Quick exterior walk-around','More complete exterior visual check','More detailed exterior visual review','Check property after departure'],
 [o('Exterior check completed','A visual check of the accessible exterior areas was completed. No obvious concern was observed in the areas checked.')],
 [o('Visible exterior damage','Visible exterior damage was observed during the visit. The affected location and appearance are described in the additional notes.'),o('Exterior access restricted','Part of the exterior could not be inspected because access was restricted.')],
 [o('Exterior inaccessible','The exterior check could not be completed because the relevant area was inaccessible.'),o('Unsafe to approach','The exterior check could not be completed safely because of a visible hazard in the approach area.')]);
add(['Quick interior walk-through','More complete interior visual walk-through','More detailed interior visual review','General condition','Complete a visual walkthrough of the property (exterior and interior)'],
 [o('Accessible areas checked','A visual walkthrough of the accessible areas was completed. No obvious concern was observed in the areas checked.')],
 [o('Visible condition concern','A visible condition requiring attention was observed during the walkthrough. The affected location is described in the additional notes.'),o('Part of property inaccessible','Part of the property was inaccessible, limiting the visual review.')],
 [o('Unable to enter','The walkthrough could not be completed because entry to the relevant area was unavailable.'),o('Unsafe to enter','The walkthrough could not be completed because the relevant area could not be entered safely.')]);
add(['Doors/gates/windows visibly secure','Doors','Windows','Gates','Fences','Shutters','Check that doors, windows and shutters are closed and in visible good condition'],
 [o('Accessible fixtures secure','The accessible fixtures checked were closed and appeared secure at the time of the visit.'),o('No obvious visible damage','No obvious visible damage was observed on the accessible fixtures checked.')],
 [o('Fixture left unsecured','An accessible fixture was found unsecured during the visit.'),o('Visible damage or misalignment','Visible damage or misalignment was observed on an accessible fixture. Its location is recorded in the additional notes.')],
 [o('Access restricted','The relevant fixtures could not be checked because access was restricted.'),o('Unsafe to operate','The affected fixture could not be checked safely using its normal control.')]);
add(['Look for obvious damage or vandalism','Look for obvious damage/vandalism','Damage/vandalism observations','Inspect for damage','Damage to existing property'],
 [o('No obvious damage observed','No obvious damage or signs of vandalism were observed in the accessible areas checked.')],
 [o('Visible damage observed','Visible damage was observed at the property. Its cause has not been confirmed.'),o('Possible tampering observed','Visible signs of possible tampering were observed. Unauthorized entry has not been confirmed.')],
 [o('Affected area inaccessible','Possible damage could not be assessed because the affected area was inaccessible.')]);
add(['Look for obvious visible water/leaks','Look for visible water/leaks','Visible water/leak observations','Water leaks','Visual checks under accessible sinks for obvious leaks','Visual checks under accessible sinks','Look for obvious visible water/leaks or moisture'],
 [o('No visible leakage observed','No visible leakage or standing water was observed in the accessible locations checked.')],
 [o('Active leak observed','An active water leak was observed. The source has not been technically diagnosed.'),o('Water staining observed','Visible water staining or dampness was observed. An active leak has not been confirmed.')],
 [o('Area inaccessible','The relevant area could not be checked for leaks because it was inaccessible.'),o('Unsafe to inspect','The relevant area could not be inspected safely for leaks or standing water.')]);
add(['Observe obvious moisture/water intrusion encountered during walk-through','Visible moisture/mold observations','Humidity','Mold','Unusual odors','Look for obvious visible problems: leaks or water issues, moisture, damage, or anything unusual after the period away','Look for obvious visible problems: damage, leaks or water issues, or anything unusual'],
 [o('No obvious moisture concern','No obvious moisture, visible mold-like growth or unusual odor was observed in the accessible areas checked.')],
 [o('Dampness or staining observed','Visible dampness or water staining was observed. Its cause has not been established.'),o('Discoloration or unusual odor','Visible discoloration or an unusual odor was observed. No laboratory identification or technical diagnosis was performed.')],
 [o('Affected area inaccessible','The relevant area could not be checked for moisture or related concerns because access was unavailable.')]);
add(['Look for obvious pest activity','Look for pest concerns/signs','Pest concerns/signs','Insects or pests'],
 [o('No obvious pest signs','No obvious signs of pest activity were observed in the accessible areas checked.')],
 [o('Signs of possible pest activity','Visible signs consistent with possible pest activity were observed. The species and extent have not been confirmed.'),o('Pest activity observed','Pest activity was observed during the visit. The affected location is recorded in the additional notes.')],
 [o('Area inaccessible','The relevant area was inaccessible and could not be checked for pest activity.')]);
add(['Confirm electricity appears available where reasonably observable','Electricity appears available where reasonably observable','Electrical supply','Electrical'],
 [o('Supply indication observed','An ordinary indication of electricity supply was observed at the checked location. This does not establish electrical safety throughout the property.')],
 [o('Power unavailable at checked location','Electricity appeared unavailable at the checked location. The cause has not been confirmed.'),o('Electrical warning sign observed','A visible electrical warning sign was observed. No technical investigation was performed by staff.')],
 [o('Equipment inaccessible','Electricity availability could not be verified because the relevant accessible indicator or equipment could not be reached safely.')]);
add(['Quick visual check of grounds/balconies','Grounds/balconies visual condition','Detailed grounds/balcony visual condition','Balconies','Garden condition','Garden','Check garden'],
 [o('No obvious grounds concern','No obvious concern was observed during the visual check of the accessible grounds or balcony areas.')],
 [o('Debris or obstruction observed','Debris or an obstruction was observed in the accessible grounds or balcony area.'),o('Visible damage or deterioration','Visible damage or deterioration was observed in the accessible grounds or balcony area.')],
 [o('Grounds area inaccessible','The relevant grounds or balcony area could not be checked because access was restricted.')]);
add(['Quick visual check of pool condition where applicable','Pool visual condition where applicable','Detailed pool visual condition where applicable','Pool','Check pool','Pool water level','Pool clarity'],
 [o('No obvious pool concern','No obvious concern was observed during the accessible visual pool check. Water chemistry and technical equipment condition were not assessed.')],
 [o('Unusual water level','The pool water level appeared unusual during the visual check. The cause has not been confirmed.'),o('Unusual clarity or debris','Unusual water clarity or visible debris was observed in the pool.')],
 [o('Pool inaccessible','The pool could not be checked because access or the view was restricted.')]);
add(['Pool equipment','Visually observe pool equipment condition'],
 [o('No obvious equipment concern','No obvious concern was observed during an accessible visual check of the pool equipment. No technical servicing or safety certification was performed.')],
 [o('Visible leak or damage','A visible leak or damage was observed in the pool equipment area.'),o('Unusual operating condition','An unusual operating condition was observed in the pool equipment area. Specialist assessment is required.')],
 [o('Equipment area inaccessible','The pool equipment area was inaccessible and could not be checked safely.')]);
add(['Notify owner if a concerning problem is discovered','Owner notification when necessary','Send owner update with photos','Owner progress update prepared'],
 [o('Owner update sent','An update about the visit observations was sent to the owner.'),o('Owner reached by phone','The owner was reached by phone and informed of the relevant observations.'),o('Update prepared for review','The owner update was prepared for review. It has not yet been sent.')],
 [o('Owner response pending','An owner response to the reported concern remains pending.'),o('Update not yet sent','The owner update has not yet been sent. Follow-up remains outstanding.')],
 [o('Contact details unavailable','The owner update could not be delivered because usable contact details were unavailable.'),o('Communication unavailable','The owner update could not be delivered because communication service was unavailable.')]);
add(['Take photos of a PROBLEM when a problem is discovered','Problem photographs when applicable','Routine property photos','More detailed photo documentation','Final photo','Take final photos','Take documentation photos','Capture the dated photo update for the owner (1–3 photos)','Photos of progress','Photos of concerns / defects'],
 [o('Photographs captured and attached','Photographs of the relevant visible condition were captured and attached to this visit record.'),o('Existing visit photographs referenced','The relevant photographs already attached to this visit record are referenced without adding duplicates.')],
 [o('Photographic coverage incomplete','Photographic coverage of the relevant areas is incomplete. Further documentation remains outstanding.')],
 [o('Unsafe to photograph','Photographs of the relevant area could not be taken safely.'),o('Recording equipment unavailable','Photographs could not be taken because suitable recording equipment was unavailable.')]);
add(['Confirm property is secured before leaving','Secure doors and gates','Secure the property as the owner has instructed'],
 [o('Accessible entrances secured','The accessible entrances checked by staff were secured before departure.'),o('Secured as instructed','The agreed securing steps were completed in accordance with the owner’s recorded instructions.')],
 [o('Unable to secure an entrance','An entrance could not be secured during the visit. Further attention is required.'),o('Owner instructions unclear','The securing instructions were unclear and require owner clarification.')],
 [o('Access restriction','The securing check could not be completed because access to the relevant entrance was restricted.'),o('Damaged control or lock','The relevant entrance could not be secured using its normal control or lock because of visible damage.')]);
add(['Owner-selected monitoring priorities','Expanded owner-selected monitoring priorities','ONBOARDING · Owner monitoring selections reviewed','ONBOARDING · Owner-specific monitoring instructions reviewed'],
 [o('Owner instructions reviewed','The recorded owner-selected monitoring priorities and instructions were reviewed for this visit.'),o('Agreed monitoring checks completed','The agreed monitoring checks within the accessible service scope were completed. Specific findings are recorded separately.')],
 [o('Clarification required','An owner-selected monitoring instruction requires clarification before it can be carried out.'),o('Requested check incomplete','An agreed monitoring check remains incomplete and requires follow-up.')],
 [o('Instructions unavailable','The relevant owner monitoring instructions were unavailable for review.'),o('Required area inaccessible','An agreed monitoring check could not be completed because the relevant area was inaccessible.')]);
add(['Written visit report','Detailed written visit report','Complete the visit record with notes and photos for the owner'],
 [o('Visit record prepared','The visit observations were recorded for owner review. Report approval and delivery are handled separately.'),o('Report reviewed','The visit report was reviewed against the observations recorded during this visit.')],
 [o('Report information outstanding','Information needed to complete the visit report remains outstanding.')],
 [o('Required information unavailable','The report could not be completed because the required visit information was unavailable.')]);
add(['Documentation of concerns','Recheck previously identified concerns','Track unresolved concerns','Give priority attention/assistance to identified concerns','ONBOARDING · Immediate follow-up items identified'],
 [o('Follow-up review completed','The previously recorded concerns were reviewed within the accessible service scope. Their current status is documented in the visit record.'),o('Concern documentation updated','The recorded observations and outstanding follow-up information were updated for owner review.')],
 [o('Concern still present','The previously recorded concern remained visible during this visit.'),o('Further follow-up required','Further follow-up is required for a recorded concern. Resolution has not been confirmed.')],
 [o('Recheck area inaccessible','The previously recorded concern could not be rechecked because the relevant area was inaccessible.'),o('Previous record unavailable','The earlier concern record was unavailable, preventing a reliable comparison.')]);
add(['Run agreed/selected faucets','Water pressure','Hot water'],
 [o('Selected tap operated','The selected tap operated during the agreed brief check. Only the observed outlet was checked.'),o('Hot water observed','Hot water was available at the selected outlet during the agreed check. System-wide performance was not assessed.')],
 [o('No flow at selected tap','No water flow was observed at the selected tap during the check. The cause has not been confirmed.'),o('Abnormal flow or temperature','An abnormal flow or temperature was observed at the selected outlet. No technical diagnosis was performed.')],
 [o('Water off or outlet inaccessible','The outlet could not be checked because the water supply was off or the selected outlet was inaccessible.')]);
add(['Flush agreed/selected toilets'],
 [o('Selected toilet flushed','The selected toilet flushed during the agreed check. Concealed drainage was not assessed.')],
 [o('Flush did not operate normally','The selected toilet did not flush normally during the check.'),o('Visible leak or overflow','A visible leak or overflow was observed at the selected toilet.')],
 [o('Toilet unavailable for check','The selected toilet could not be checked because access or water supply was unavailable.')]);
add(['Operate selected lights','Lights','Outdoor lighting','Test lights'],
 [o('Selected lights operated','The selected lights operated using their normal controls at the time of the check.')],
 [o('Selected light did not operate','A selected light did not operate using its normal control. The cause has not been diagnosed.'),o('Visible fitting damage','Visible damage to a light fitting was observed. Staff did not attempt technical repair.')],
 [o('Power or access unavailable','The selected lights could not be checked because power or access to the normal controls was unavailable.')]);
add(['Check whether agreed refrigerator/freezer or other agreed appliances appear to operate','Appliances','Check refrigerator'],
 [o('Selected appliance operating','The selected appliance appeared to operate during the agreed ordinary-use check. No technical performance assessment was performed.')],
 [o('Selected appliance not operating','The selected appliance did not appear to operate using its normal control. The cause has not been diagnosed.'),o('Unusual appliance condition','An unusual visible condition or operating indication was observed on the selected appliance.')],
 [o('Power or access unavailable','The selected appliance could not be checked because power or access was unavailable.')]);
add(['Briefly operate agreed AC units','Air conditioning','Heating','Check air conditioning'],
 [o('Unit responded to normal control','The selected unit responded to its normal control during the agreed brief check. No technical performance assessment was performed.')],
 [o('Unit did not start','The selected unit did not start using its normal control. The cause has not been diagnosed.'),o('Error or unusual operation','An error indication or unusual operation was observed on the selected unit.')],
 [o('Control or power unavailable','The selected unit could not be checked because its normal control or power supply was unavailable.')]);
add(['Internet','Check Wi-Fi'],
 [o('Connection confirmed at check','A connection was established on the device used for the brief check. Performance beyond that check was not assessed.')],
 [o('Connection unavailable','A connection could not be established during the check. The cause has not been confirmed.')],
 [o('Credentials or equipment unavailable','Connectivity could not be checked because the required credentials or equipment were unavailable.')]);
add(['Security system','Check alarm'],
 [o('Panel visually checked','The accessible security-system panel appeared powered, with no obvious warning indication observed. No technical system test was performed.')],
 [o('Warning indication observed','A warning indication was observed on the security-system panel.'),o('Panel appeared unpowered','The security-system panel appeared unpowered. The cause has not been confirmed.')],
 [o('Authorized access unavailable','The security system could not be checked because authorized access or instructions were unavailable.')]);
add(['Irrigation'],
 [o('Agreed irrigation check completed','The agreed irrigation check was completed using the normal control. The observation was limited to the selected accessible area.')],
 [o('Visible irrigation leak','A visible irrigation leak was observed.'),o('Selected area not receiving water','The selected irrigation area did not appear to receive water during the agreed check.')],
 [o('Controls or instructions unavailable','Irrigation could not be checked because authorized instructions, water supply or normal controls were unavailable.')]);
add(['Roof','Exterior walls','Drainage','Storm damage','Signs of forced entry'],
 [o('No obvious visible concern','No obvious concern was observed on the relevant exterior feature from accessible observation points. Hidden areas were not assessed.')],
 [o('Visible damage observed','Visible damage was observed on the relevant exterior feature. The cause and extent beyond the visible area have not been confirmed.'),o('Obstruction or debris observed','An obstruction or accumulated debris was observed on the relevant accessible exterior feature.')],
 [o('View or access restricted','The relevant exterior feature could not be checked because the view or safe access was restricted.')]);
add(['Cleanliness','Confirm cleaning'],
 [o('Cleaning condition reviewed','The accessible areas were visually reviewed for the agreed level of cleanliness. No obvious concern was observed in those areas.'),o('Cleaning completion confirmed','Completion of the agreed cleaning was confirmed for the accessible areas reviewed.')],
 [o('Cleaning still needed','Visible cleaning work remains outstanding in part of the property.'),o('Cleaning completion unconfirmed','Completion of the requested cleaning has not been confirmed.')],
 [o('Areas inaccessible','The cleaning condition could not be reviewed because the relevant areas were inaccessible.')]);
add(['Electricity meter','Water meter'],
 [o('Meter reading recorded','The accessible meter reading was recorded in the meter-reading section of this visit.'),o('Meter photograph attached','A photograph of the accessible meter display was attached to this visit record.')],
 [o('Display unreadable','The meter display could not be read clearly during the visit.'),o('Visible meter concern','A visible concern was observed at the meter. Staff did not adjust or service the installation.')],
 [o('Meter inaccessible','The relevant meter could not be read because access was restricted.')]);
add(["Open and air out property", "Air the property as appropriate"],
 [o("Property aired","The accessible property was aired during the visit, with openings secured again as instructed.")],
 [o("Airing restricted","Airing was limited because conditions or access did not allow the planned openings to be used.")],
 [o("Airing unavailable","The property could not be aired because access or clear owner instructions were unavailable.")]);
add(["Turn on electricity", "Turn on water", "Turn on hot water", "Start air conditioning"],
 [o("Authorized start completed","The requested service was switched on using its normal control, in accordance with the owner’s instructions. This was not a technical inspection.")],
 [o("Start unsuccessful","The requested service did not respond as expected to its normal control. No repairs or technical adjustments were attempted.")],
 [o("Instructions or control unavailable","The requested service was not switched on because clear authorization or access to its normal control was unavailable.")]);
add(["Inspect bathrooms", "Inspect bedrooms"],
 [o("Room review completed","The accessible rooms were visually reviewed for arrival readiness. No obvious readiness concern was observed in the areas checked.")],
 [o("Room preparation outstanding","Part of the room preparation remains outstanding. The affected area and outstanding work are recorded in the visit notes.")],
 [o("Room inaccessible","The relevant rooms could not be reviewed because access was unavailable.")]);
add(["Prepare linens"],
 [o("Linens prepared","The agreed linens were prepared for the expected arrival.")],
 [o("Linens unavailable","The required linens were missing or unsuitable, so preparation could not be completed as planned.")],
 [o("Linen preparation unverified","Linen preparation could not be verified because the relevant rooms or linen storage were inaccessible.")]);
add(["Place welcome items"],
 [o("Welcome items placed","The agreed welcome items were placed in the property for the expected arrival.")],
 [o("Items missing","Some agreed welcome items were unavailable and remain outstanding.")],
 [o("Placement unverified","Placement of welcome items could not be verified because access or the agreed item list was unavailable.")]);
add(["Confirm keys", "Record keys", "Return or store keys according to the owner's recorded key instructions for this visit", "ONBOARDING · Keys/access items received or available as agreed"],
 [o("Key arrangements confirmed","The agreed keys or access items were accounted for and handled according to the owner’s recorded instructions. Access codes are not included in this report.")],
 [o("Key discrepancy","A discrepancy was identified in the agreed keys or access-item arrangements. Follow-up is required through the approved secure channel.")],
 [o("Key arrangements unverified","The key or access-item arrangements could not be verified from the information or items available.")]);
add(["Close windows and shutters", "Check that doors, shutters and gates are as the owner instructed"],
 [o("Openings set as instructed","The accessible openings were set in accordance with the owner’s recorded instructions.")],
 [o("Opening could not be secured","An opening could not be set or secured as instructed using its normal control.")],
 [o("Openings inaccessible","The relevant openings could not be checked because safe access or clear instructions were unavailable.")]);
add(["Turn off selected utilities"],
 [o("Authorized shutdown completed","Only the selected services specified in the owner’s instructions were switched off using their normal controls.")],
 [o("Shutdown incomplete","The requested shutdown could not be completed as instructed. No technical adjustments were attempted.")],
 [o("Shutdown instructions unavailable","No shutdown was attempted because clear instructions or access to the authorized controls were unavailable.")]);
add(["Remove rubbish"],
 [o("Rubbish removed","The agreed rubbish was removed from accessible areas and placed at the designated disposal point.")],
 [o("Removal incomplete","Some rubbish remains because the planned removal could not be completed.")],
 [o("Removal not possible","Rubbish removal could not be completed because access or a suitable designated disposal point was unavailable.")]);
add(["Carry out the property-specific opening steps approved by the owner in advance (recorded on this visit's owner approval)", "Carry out the property-specific closing steps approved by the owner in advance (recorded on this visit's owner approval)", "Operate simple controls (opening/shutting windows and shutters, airing) only where the owner's recorded instructions are clear", "Operate simple controls (opening/shutting windows and shutters) only where the owner's recorded instructions are clear"],
 [o("Approved steps completed","The applicable steps were completed using simple controls and the owner’s recorded instructions.")],
 [o("Approved steps partly completed","Some approved steps remain incomplete. The outstanding steps and the reason for stopping are recorded in the visit notes.")],
 [o("Approval unavailable","The steps were not undertaken because clear recorded owner approval or safe access was unavailable.")]);
add(["Stop any unclear or apparently problematic step, document what is seen, and ask the owner how to proceed"],
 [o("No stop needed","No unclear or apparently problematic step was encountered during the authorized work performed.")],
 [o("Step stopped for owner decision","A step was stopped because the instructions or observed condition required clarification. Owner direction is required before continuing.")],
 [o("Steps not reached","The relevant steps could not be reviewed because the planned work was not reached or access was unavailable.")]);
add(["Utility systems (water, electricity, pool, water heater, alarms): act only on the owner's recorded property-specific instructions — otherwise flag for the owner or an appropriate provider; never start or adjust automatically"],
 [o("Authorized utility steps completed","Only the utility steps covered by the owner’s recorded property-specific instructions were carried out using normal controls.")],
 [o("Utility step deferred","A utility step was deferred because the instructions or observed condition required owner clarification or an appropriate provider.")],
 [o("Utility instructions unavailable","Utility actions were not undertaken because clear property-specific instructions or authorized access were unavailable.")]);
add(["Confirm owner shopping list and budget"],
 [o("List and budget confirmed","The shopping list and spending limit were confirmed with the owner before purchasing.")],
 [o("Clarification required","The shopping list or spending limit requires clarification before purchasing can proceed.")],
 [o("Confirmation unavailable","The owner’s shopping list and spending limit could not be confirmed.")]);
add(["Purchase requested groceries"],
 [o("Requested groceries purchased","The requested groceries were purchased within the agreed shopping instructions and budget.")],
 [o("Items unavailable","Some requested items were unavailable. Any substitutions or outstanding items are recorded in the visit notes.")],
 [o("Purchase not possible","The purchase could not be completed because the required approval, funds or access to the requested items was unavailable.")]);
add(["Deliver groceries to the property"],
 [o("Groceries delivered","The purchased groceries were delivered to the agreed property.")],
 [o("Delivery incomplete","Delivery could not be completed as arranged. The outstanding delivery arrangements are recorded in the visit notes.")],
 [o("Delivery unverified","Delivery could not be verified because property access or confirmation was unavailable.")]);
add(["Put away / stock basics"],
 [o("Groceries put away","The delivered groceries were put away in the agreed storage areas. Items requiring refrigeration were placed in the available refrigerator.")],
 [o("Storage concern","Some groceries could not be stored as planned because suitable storage was unavailable.")],
 [o("Storage inaccessible","Groceries could not be put away because the relevant storage areas were inaccessible.")]);
add(["Record grocery cost and attach receipt photo"],
 [o("Cost and receipt recorded","The grocery cost was recorded and the corresponding receipt photograph was attached to the visit record.")],
 [o("Receipt outstanding","The grocery cost or supporting receipt remains outstanding in the visit record.")],
 [o("Cost unverified","The grocery cost could not be verified because the supporting receipt or purchase information was unavailable.")]);
add(["Record arrival time and site access", "ONBOARDING · Property access confirmed"],
 [o("Access confirmed","Access was available through the agreed entrance at the recorded arrival time.")],
 [o("Access partly blocked","Access was restricted at part of the property. The affected entrance or area is identified in the visit notes.")],
 [o("Unable to enter","Property access could not be obtained during the visit.")]);
add(["Record departure time"],
 [o("Departure recorded","The departure time was recorded after the site visit.")],
 [o("Departure record discrepancy","The departure-time record requires clarification.")],
 [o("Departure time unverified","The departure time could not be independently verified.")]);
add(["Contractors present", "Contractor / crew present"],
 [o("Expected crew present","The expected contractor or crew was present during the site visit.")],
 [o("Expected crew absent","The expected contractor or crew was not present during the site visit.")],
 [o("Attendance unverified","Contractor attendance could not be verified because the relevant site area was inaccessible.")]);
add(["Materials delivered", "Materials on site", "Materials appear correct"],
 [o("Materials visually reviewed","The accessible materials were visually reviewed against the information provided for this visit. This was not a technical certification of suitability.")],
 [o("Material discrepancy","A discrepancy or visible concern was observed in the accessible materials compared with the information provided.")],
 [o("Materials unverified","Materials could not be checked because access or the relevant specification or delivery information was unavailable.")]);
add(["Work expected", "Confirm scope of today's work"],
 [o("Scope confirmed","The work planned for this visit was confirmed against the available agreed scope.")],
 [o("Scope unclear","The planned work does not have a sufficiently clear agreed scope and requires owner clarification.")],
 [o("Scope unavailable","The relevant agreed scope was unavailable for review.")]);
add(["Work observed", "Work completed since previous visit", "Work matches agreed scope"],
 [o("Visible progress recorded","The accessible work was visually reviewed against the available scope and progress information. No obvious discrepancy was observed in the areas checked.")],
 [o("Scope or progress discrepancy","An apparent difference between the observed work and the available scope or progress information requires clarification.")],
 [o("Work inaccessible","The relevant work could not be visually reviewed because access or comparison information was unavailable.")]);
add(["Workmanship concerns", "Visible workmanship quality", "Defects / concerns"],
 [o("No obvious workmanship concern","No obvious workmanship concern was observed in the accessible areas viewed. This was a visual observation, not technical acceptance or certification.")],
 [o("Visible workmanship concern","A visible workmanship concern was observed and requires review by the responsible contractor or an appropriate specialist.")],
 [o("Work concealed or inaccessible","Workmanship could not be visually reviewed because the relevant work was concealed or inaccessible.")]);
add(["Incomplete work", "Unfinished work", "Next contractor actions"],
 [o("Outstanding work recorded","The remaining work and agreed next contractor actions were recorded from the information available during the visit.")],
 [o("Outstanding action unresolved","Outstanding work or the next contractor action requires clarification before progress can be confirmed.")],
 [o("Next action unverified","The remaining work or next contractor action could not be verified from the access and information available.")]);
add(["Questions for owner decision", "Owner decision required", "Changes requiring owner approval"],
 [o("No new decision required","No new owner decision was identified within the scope reviewed during this visit.")],
 [o("Owner decision needed","An owner decision is required before the related work can proceed. No approval was given on the owner’s behalf.")],
 [o("Decision requirements unverified","Owner-decision requirements could not be verified because the relevant scope or proposal was unavailable.")]);
add(["Work area inspected"],
 [o("Accessible work area reviewed","The accessible work area was visually reviewed and the visit observations were recorded.")],
 [o("Work-area concern","A visible concern was observed in the work area and is documented for follow-up.")],
 [o("Work area inaccessible","The work area could not be reviewed because safe access was unavailable.")]);
add(["Measurements / dimensions checked where applicable"],
 [o("Selected dimensions recorded","The agreed accessible dimensions were checked and recorded for comparison. These observations do not replace a professional survey.")],
 [o("Dimension discrepancy","A difference was noted between a checked dimension and the reference information supplied. Contractor clarification is required.")],
 [o("Measurement unavailable","The selected dimensions could not be checked because safe access or reference information was unavailable.")]);
add(["Progress compared with schedule", "Expected next visit / milestone"],
 [o("Schedule update recorded","The reported progress and next milestone were recorded against the schedule available for this visit.")],
 [o("Schedule concern","Observed or reported progress indicates a possible delay against the available schedule. The revised milestone requires confirmation.")],
 [o("Schedule unavailable","Progress could not be compared with a confirmed schedule because current schedule information was unavailable.")]);
add(["Safety / site condition"],
 [o("Accessible site condition reviewed","The accessible site condition was visually reviewed. No obvious site-condition concern was observed in the areas viewed; no formal safety inspection was performed.")],
 [o("Visible site hazard","A visible site hazard was observed. The affected area and actions taken are recorded in the visit notes.")],
 [o("Unsafe to inspect","The relevant site area could not be reviewed because it could not be approached safely.")]);
add(["Changes requested by contractor", "Additional cost / variation mentioned"],
 [o("No new variation reported","No new change request or additional cost was reported during this visit.")],
 [o("Variation requires owner approval","A proposed change or additional cost was raised and requires owner review. No authorization was given on the owner’s behalf.")],
 [o("Variation information unavailable","Change requests or additional costs could not be verified because the relevant contractor information was unavailable.")]);
add(["Receipts / invoices received"],
 [o("Documents received","The documents received during this visit were recorded for owner review. Receipt does not confirm approval or payment.")],
 [o("Document discrepancy","A missing or inconsistent detail was identified in the documents received and requires clarification.")],
 [o("Documents unavailable","The expected receipts or invoices were unavailable for review.")]);
add(["ONBOARDING · Front/general exterior starting condition / baseline photo", "ONBOARDING · Rear/other accessible exterior starting condition / baseline photo where relevant", "ONBOARDING · General interior starting condition / baseline photos"],
 [o("Baseline documented","The accessible starting condition was visually documented with baseline photographs for future comparison.")],
 [o("Baseline concern documented","A visible concern was documented in the baseline record for owner review. The record describes the observed condition without confirming its cause.")],
 [o("Baseline access restricted","The baseline record is incomplete because the relevant area was inaccessible.")]);
add(["ONBOARDING · Obvious visible signs of water intrusion / leaks / humidity"],
 [o("No obvious water concern","No obvious visible signs of water intrusion, leakage or moisture were observed in the accessible areas checked.")],
 [o("Visible water or moisture concern","Visible signs of water or moisture were observed and documented in the baseline record. The source has not been confirmed.")],
 [o("Moisture review restricted","The relevant area could not be reviewed because access was restricted.")]);
add(["ONBOARDING · Owner-identified concern areas reviewed / baseline photos where appropriate", "ONBOARDING · Significant known or visible pre-existing exterior damage documented / photos", "ONBOARDING · Significant known or visible pre-existing interior damage documented / photos", "ONBOARDING · Other known pre-existing problems documented"],
 [o("Starting condition recorded","The available information and accessible condition relevant to this item were documented in the onboarding record for future comparison.")],
 [o("Concern requires follow-up","A known or visible concern requires owner review or specialist follow-up. Its cause and full extent have not been confirmed.")],
 [o("Relevant condition unverified","The relevant condition could not be documented fully because access or supporting information was unavailable.")]);
add(["ONBOARDING · Important utility shutoff locations identified where needed for Property Care service"],
 [o("Locations identified","The relevant accessible utility shutoff locations were identified for property-care reference. Identification does not confirm operation or system condition.")],
 [o("Location or labeling unclear","A relevant utility shutoff location or its labeling could not be clearly identified and requires clarification.")],
 [o("Locations inaccessible","The relevant utility shutoff locations could not be reviewed because access was unavailable.")]);
add(["ONBOARDING · Property features relevant to service confirmed (for example pool, garden, irrigation, HVAC, shutters or security)"],
 [o("Relevant features recorded","The accessible property features relevant to the agreed service were identified and recorded. This did not include specialist system testing.")],
 [o("Feature information incomplete","Information about a relevant property feature requires clarification before the related service can be confirmed.")],
 [o("Features inaccessible","Relevant property features could not be reviewed because access or property information was unavailable.")]);
add(["ONBOARDING · Existing service providers / contractors relevant to Property Care noted where applicable"],
 [o("Provider details recorded","The service-provider information supplied for the agreed property-care service was recorded.")],
 [o("Provider details incomplete","Relevant service-provider information is incomplete and requires owner confirmation.")],
 [o("Provider information unavailable","Relevant service-provider information was unavailable for review.")]);
add(["ONBOARDING · Emergency / owner-contact instructions reviewed"],
 [o("Contact instructions reviewed","The supplied emergency and owner-contact instructions were reviewed for the agreed property-care service. Sensitive contact details remain in the appropriate private record.")],
 [o("Instructions need clarification","The emergency or owner-contact instructions require clarification before they can be relied on.")],
 [o("Instructions unavailable","Emergency and owner-contact instructions were unavailable for review.")]);
add(["ONBOARDING · Overall starting condition and onboarding summary"],
 [o("Onboarding summary recorded","The accessible starting condition, agreed service information and visit limitations were summarized in the onboarding record.")],
 [o("Onboarding follow-up outstanding","Onboarding identified outstanding information or concerns requiring follow-up before the relevant service arrangements can be finalized.")],
 [o("Onboarding incomplete","The onboarding review could not be completed because required access or service information was unavailable.")]);

// More specific wording where a broad condition category would be misleading.
registry["Hot water"] = {
 normal: [o("Hot water available","Hot water was available at the selected outlet during the agreed brief check. System-wide performance was not assessed.")],
 concern: [o("Hot water unavailable","Hot water was not available at the selected outlet during the check. The cause has not been confirmed.")],
 unable: [o("Outlet inaccessible","Hot water could not be checked because the selected outlet or water supply was unavailable.")]
};
registry["Water pressure"] = {
 normal: [o("Flow observed at selected outlet","Water flow was observed at the selected outlet during the brief check. No pressure measurement or system-wide assessment was performed.")],
 concern: [o("Reduced or irregular flow","Reduced or irregular water flow was observed at the selected outlet. The cause has not been confirmed.")],
 unable: [o("Supply or access unavailable","Water flow could not be checked because access or the water supply was unavailable.")]
};
registry["Signs of forced entry"] = {
 normal: [o("No visible signs observed","No obvious visible signs of forced entry were observed at the accessible entry points checked.")],
 concern: [o("Possible forced-entry signs","Visible signs of possible forced entry were observed. The cause and circumstances have not been confirmed.")],
 unable: [o("Entry points inaccessible","The relevant entry points could not be reviewed because safe access was unavailable.")]
};
registry["Roof"] = {
 normal: [o("Roof viewed from accessible points","No obvious roof concern was observed from accessible observation points. Concealed areas and areas outside the line of sight were not assessed.")],
 concern: [o("Visible roof concern","A visible roof concern was observed from an accessible observation point. The extent and cause require specialist assessment.")],
 unable: [o("Roof view obstructed","The roof could not be visually checked because the view from safe observation points was obstructed.")]
};
registry["Drainage"] = {
 normal: [o("No visible drainage obstruction","No obvious obstruction was observed at the accessible drainage points checked. Concealed drainage performance was not assessed.")],
 concern: [o("Obstruction or standing water","An obstruction or standing water was observed at an accessible drainage point.")],
 unable: [o("Drainage inaccessible","The relevant drainage points could not be checked because safe access was unavailable.")]
};
registry["Storm damage"] = {
 normal: [o("No obvious storm-related damage","No obvious visible storm-related damage was observed in the accessible areas checked. Hidden damage was not assessed.")],
 concern: [o("Possible storm-related damage","Visible damage potentially associated with recent weather was observed. Its cause and full extent have not been confirmed.")],
 unable: [o("Affected areas inaccessible","Possible weather-related damage could not be checked because safe access to the affected areas was unavailable.")]
};
registry["ONBOARDING · Immediate follow-up items identified"] = {
 normal: [o("Follow-up review recorded","The immediate follow-up review was recorded in the onboarding summary, including any outstanding actions.")],
 concern: [o("Immediate follow-up required","An immediate follow-up item was identified during onboarding. The required action and responsible party need confirmation.")],
 unable: [o("Follow-up review incomplete","Immediate follow-up requirements could not be fully reviewed because the relevant access or information was unavailable.")]
};
// Exterior-only visits: observations stay outside and never imply interior access.
add(['Exterior walls, visible damage or vandalism'],
 [o('No obvious exterior wall damage','No obvious damage or signs of vandalism were observed on the exterior walls visible from the accessible outside areas checked.')],
 [o('Visible exterior wall damage','Visible damage or possible vandalism was observed on an exterior wall. The location and appearance are described in the additional notes; the cause has not been confirmed.')],
 [o('Exterior wall view restricted','The relevant exterior wall could not be visually checked because the view or safe outside access was restricted.')]);
add(['Grounds, paths and visible drainage'],
 [o('No obvious grounds or drainage concern','No obvious obstruction or standing water was observed on the accessible grounds, paths or visible drainage points checked. Concealed drainage was not assessed.')],
 [o('Obstruction or standing water outside','An obstruction or standing water was observed on the grounds, a path or a visible drainage point. The location is described in the additional notes.')],
 [o('Grounds or drainage inaccessible','The relevant grounds, path or visible drainage point could not be checked because safe outside access or the view was restricted.')]);
add(['Gates, fences and exterior access points'],
 [o('No obvious access-point concern','No obvious damage or unsecured gate was observed at the accessible gates, fences and exterior access points checked.')],
 [o('Gate unsecured or visible damage','An unsecured gate or visible damage to a gate, fence or exterior access point was observed. The affected location is recorded in the additional notes.')],
 [o('Exterior access point inaccessible','The relevant gate, fence or exterior access point could not be visually checked because safe access or the view was restricted.')]);
add(['Exterior doors and shutters — visible condition'],
 [o('No obvious door or shutter concern','No obvious visible damage or unsecured opening was observed on the exterior doors and shutters checked from outside. No interior entry was made for this check.')],
 [o('Door or shutter concern visible','Visible damage or an apparently unsecured exterior door or shutter was observed from outside. The location is described in the additional notes.')],
 [o('Door or shutter view restricted','The relevant exterior door or shutter could not be visually checked because the view from safe outside observation points was restricted.')]);
add(['Windows — visible condition from outside only'],
 [o('No obvious window concern outside','No obvious visible damage or open window was observed on the windows checked from outside. Interior window condition was not assessed.')],
 [o('Window concern visible outside','An open window or visible window damage was observed from outside. The affected location is described in the additional notes.')],
 [o('Outside window view restricted','The relevant window could not be visually checked because the view from safe outside observation points was restricted.')]);
add(['Visible signs of water leaks or storm damage outside'],
 [o('No obvious exterior water or storm concern','No obvious visible signs of water leakage or storm-related damage were observed in the accessible outside areas checked. Hidden damage was not assessed.')],
 [o('Water or possible storm damage outside','Visible water, staining or possible storm-related damage was observed outside. The location and appearance are described in the additional notes; the cause has not been confirmed.')],
 [o('Outside area inaccessible','The relevant outside area could not be visually checked for water or storm-related concerns because safe access or the view was restricted.')]);
add(['Garden, balcony or pool areas visible from outside'],
 [o('No obvious concern in visible outside areas','No obvious concern was observed in the garden, balcony or pool areas visible from the outside observation points used. Concealed areas, pool chemistry and equipment operation were not assessed.')],
 [o('Concern visible from outside','A visible concern was observed in a garden, balcony or pool area from outside. The area and observation are described in the additional notes.')],
 [o('Outside view unavailable','The relevant garden, balcony or pool area could not be visually checked because no safe outside view was available.')]);
add(['Photographs of exterior observations only'],
 [o('Exterior photographs recorded','Photographs of the exterior observations were captured for this visit. No interior photographs were taken.')],
 [o('Exterior photo coverage limited','Exterior photographs were captured, but coverage of a relevant observation was limited. The missing view and reason are described in the additional notes.')],
 [o('Exterior photographs unavailable','The required exterior photographs could not be captured. The reason and affected observations are recorded in the additional notes.')]);
add(['Confirm no entry into the home or interior areas'],
 [o('No interior entry made','No entry into the home or interior areas was made during this exterior-only visit.')],
 [o('Interior access exception to document','An exception to the exterior-only access boundary occurred. The circumstances and any owner instructions must be recorded and brought to the responsible person’s attention.')],
 [o('Access boundary not confirmed','The no-interior-entry confirmation could not be established from the available visit information. The missing information is recorded in the additional notes.')]);
export const CHECKLIST_SUGGESTED_ANSWERS = registry;
const STATUS_ALIASES = { Pass: 'Normal', 'Needs Attention': 'Important', Critical: 'Emergency' };
export function hasSuggestedAnswers(visitType, name) {
 return visitType === 'Emergency Visit' ? Object.hasOwn(EMERGENCY_SUGGESTED_ANSWERS, name) : Object.hasOwn(registry, name);
}
export function suggestedAnswers(visitType, name, status) {
 if (visitType === 'Emergency Visit') return emergencyAnswers(visitType, name, status);
 const set = registry[name];
 if (!set) return [];
 const normalized = STATUS_ALIASES[status] || status;
 if (normalized === 'N/A') return [o('Outside this visit’s scope', 'This item was not applicable to the agreed scope or features of the property for this visit.')];
 const key = { Normal: 'normal', Important: 'concern', Emergency: 'concern', 'Unable to Check': 'unable' }[normalized];
 return key ? set[key] || [] : [];
}
