// Ready-made descriptions, selected explicitly by staff. Never infer a status,
// a diagnosis, completed work, or a cause from the question or another answer.
const option = (label, text) => ({ label, text });
const group = (normal, concern, unable, na = 'This item did not apply to the scope of this emergency visit and was not assessed.') => ({ normal, concern, unable, na });
export const EMERGENCY_SUGGESTED_ANSWERS = {
 'Confirm reason for emergency call': group(
  [option('Reported concern not observed', 'The reported condition was not observed in the areas checked during this visit. This does not rule out a condition outside those areas.')],
  [option('Fallen tree', 'A fallen tree was observed affecting the property.'), option('Water entering property', 'Water was observed entering the property.'), option('Reported incident', 'This visit was made in response to a reported incident.')],
  [option('Unable to gain entry', 'The reported incident could not be verified because staff could not gain entry to the property.'), option('Unsafe to approach', 'The reported incident could not be verified at close range because the affected area could not be approached safely.')]),
 'Property access / security': group(
  [option('Main entrance accessible', 'The main entrance was accessible at the time of the visit.'), option('Access arranged for crew', 'Access arrangements were confirmed for the responding crew. The condition of other entrances was not established by that confirmation.')],
  [option('Main entrance inaccessible', 'The main entrance could not be accessed during this visit.'), option('Access partly blocked', 'Access to part of the property was obstructed at the time of the visit.'), option('Entrance unsecured', 'An entrance to the property was found unsecured at the time of the visit.')],
  [option('Access could not be checked', 'Property access could not be assessed because the entrance could not be reached safely.'), option('Keys unavailable', 'Property access could not be checked because the required keys or authorized access arrangements were unavailable.')]),
 'Immediate safety hazard': group(
  [option('No obvious hazard observed', 'No obvious immediate safety hazard was observed in the accessible areas checked during this visit.')],
  [option('Unsafe area observed', 'A visible hazard was identified in part of the property. The affected location and observed condition require attention.'), option('Evacuation confirmed', 'Evacuation of the property was confirmed in response to the incident. Re-entry safety has not been established.'), option('Falling material', 'Falling or unstable material was observed near the property. The affected area requires assessment by appropriate responders.')],
  [option('Unsafe area inaccessible', 'The affected area could not be inspected safely. The presence or extent of immediate hazards remains unverified.'), option('Visibility restricted', 'Immediate hazards could not be fully assessed because visibility of the affected area was restricted.')]),
 'Water leak / flooding': group(
  [option('No visible leak or flooding', 'No visible water leak or flooding was observed in the accessible areas checked during this visit.')],
  [option('Active water leak', 'An active water leak was observed at the property.'), option('Standing water', 'Standing water was observed at the property. The source and extent beyond the visible area have not been confirmed.'), option('Water intrusion', 'Visible water intrusion was observed inside the property. The source has not been technically assessed.')],
  [option('Affected area inaccessible', 'The affected area could not be accessed to check for leaks or flooding.'), option('Unsafe to inspect', 'The affected area could not be inspected safely for leaks or flooding.')]),
 'Electrical hazard': group(
  [option('No visible warning signs', 'No obvious electrical warning signs were observed in the accessible areas checked. No technical electrical safety assessment was performed.')],
  [option('Sparking observed', 'Sparking was observed at the property. Electrical safety requires assessment by appropriate responders.'), option('Damaged cable visible', 'Visible cable damage was observed. Whether the cable is energized has not been verified.'), option('Water near electrical equipment', 'Water was observed near electrical equipment. The equipment and surrounding area have not been confirmed safe.')],
  [option('Area unsafe to approach', 'Electrical condition could not be checked because the affected area could not be approached safely.'), option('Equipment inaccessible', 'The relevant electrical equipment was inaccessible. Its condition remains unverified.')]),
 'Fire / smoke damage': group(
  [option('No visible fire or smoke signs', 'No visible signs of fire, smoke or scorching were observed in the accessible areas checked during this visit.')],
  [option('Smoke observed', 'Smoke was observed at the property. Its source and the extent of any associated damage have not been confirmed.'), option('Flames observed', 'Visible flames were observed at the property. The affected area requires emergency response.'), option('Scorching or soot', 'Visible scorching or soot was observed. The cause and full extent of damage have not been established.')],
  [option('Unsafe to enter', 'The area could not be entered safely to assess fire or smoke damage.'), option('Affected area inaccessible', 'The affected area was inaccessible, so fire or smoke damage could not be assessed.')]),
 'Storm / weather damage': group(
  [option('No obvious damage observed', 'No obvious weather-related damage was observed in the accessible areas checked during this visit.')],
  [option('Fallen tree or branches', 'A fallen tree or branches were observed affecting the property. The cause of the fall has not been confirmed.'), option('Displaced roof covering', 'Displaced roof covering was visible from the ground. Roof condition beyond that view has not been assessed.'), option('Debris at property', 'Debris was observed at the property following reported severe weather. Further damage assessment is pending.')],
  [option('Affected area inaccessible', 'Additional weather-related damage could not be assessed because the affected area was inaccessible.'), option('View restricted', 'The view of the affected area was restricted, preventing assessment of possible weather-related damage.')]),
 'Break-in / forced entry': group(
  [option('No visible forced entry signs', 'No visible signs of forced entry were observed at the accessible entrances checked during this visit.')],
  [option('Lock damage', 'Visible damage to a lock or its fittings was observed. Unauthorized entry has not been confirmed.'), option('Damaged entrance', 'Visible damage or tampering was observed at an entrance. The circumstances have not been established.')],
  [option('Entrances inaccessible', 'Entrances could not be inspected for signs of forced entry because access was restricted.'), option('Unsafe to inspect', 'The relevant entrance could not be inspected safely for signs of forced entry.')]),
 'Door / window damage': group(
  [option('No visible damage observed', 'No visible door or window damage was observed on the accessible fixtures checked during this visit.')],
  [option('Broken glazing', 'Broken glazing was observed at the property.'), option('Damaged frame', 'Visible damage to a door or window frame was observed. The ability to secure it requires confirmation.'), option('Unable to secure opening', 'An affected door or window could not be secured using its normal controls.')],
  [option('Fixtures inaccessible', 'The relevant doors or windows were inaccessible and could not be checked.'), option('Unsafe to operate', 'The affected door or window could not be checked safely because visible damage prevented normal operation.')]),
 'Plumbing failure': group(
  [option('No visible failure observed', 'No visible plumbing failure was observed in the accessible areas checked. Hidden pipework was not assessed.')],
  [option('Visible pipe leak', 'A leak was observed at a visible pipe or connection. The cause has not been technically diagnosed.'), option('Overflow observed', 'An overflow was observed at a plumbing fixture. The cause and condition of concealed pipework remain unverified.'), option('Drainage problem', 'A drainage problem was observed during ordinary use. A technical assessment has not been performed.')],
  [option('Pipework inaccessible', 'The relevant pipework or fixture was inaccessible and could not be checked.'), option('Unsafe to check', 'The affected area could not be approached safely to check the reported plumbing problem.')]),
 'Air conditioning / heating failure': group(
  [option('Responded to normal control', 'The selected unit responded to its normal control during a brief operational check. No technical performance assessment was performed.')],
  [option('Unit did not start', 'The selected unit did not start using its normal control. The cause has not been diagnosed.'), option('Error displayed', 'The selected unit displayed an error indication.'), option('Abnormal operation observed', 'Abnormal operation was observed during ordinary use of the selected unit. A technical assessment is required.')],
  [option('Controls unavailable', 'The unit could not be checked because its normal control was unavailable.'), option('Power unavailable', 'The unit could not be checked because power was unavailable at the time of the visit.')]),
 'Pool / equipment emergency': group(
  [option('No obvious pool concern observed', 'No obvious pool or equipment concern was observed during an accessible visual check. No technical equipment assessment was performed.')],
  [option('Water loss or leak observed', 'Visible water loss or a leak was observed in the pool or equipment area. The source has not been technically confirmed.'), option('Equipment damage visible', 'Visible damage to pool equipment was observed. Operation and electrical safety have not been verified.'), option('Abnormal water condition', 'An abnormal pool-water condition was observed. Water chemistry and the cause have not been established.')],
  [option('Pool area inaccessible', 'The pool or equipment area was inaccessible and could not be checked.'), option('Unsafe to approach equipment', 'The pool equipment could not be approached safely, so its condition remains unverified.')]),
 'Structural damage': group(
  [option('No obvious damage visible', 'No obvious structural damage was visible from the accessible observation points. This was not a structural safety assessment.')],
  [option('Impact to building visible', 'Visible impact to the building was observed. The extent of damage and structural safety require specialist assessment.'), option('Cracking or displacement', 'Visible cracking or displacement was observed. Its cause and significance have not been assessed by a structural professional.'), option('Sagging or instability visible', 'Visible sagging or apparent instability was observed. The affected area has not been confirmed safe.')],
  [option('Affected area unsafe', 'The affected part of the building could not be inspected safely. Structural condition remains unverified.'), option('View obstructed', 'The affected part of the building was obscured from accessible observation points, preventing a visual assessment.')]),
 'Damage to contents': group(
  [option('No visible contents damage', 'No visible contents damage was observed in the accessible areas checked. Concealed damage has not been ruled out.')],
  [option('Visible water damage', 'Visible water damage to contents was observed.'), option('Visible impact damage', 'Visible impact damage to contents was observed. The extent of damage beyond the visible items has not been assessed.')],
  [option('Room inaccessible', 'Contents could not be assessed because the affected room was inaccessible.'), option('Unsafe to enter', 'Contents could not be assessed because the affected area could not be entered safely.')]),
 'Utilities status': group(
  [option('Electricity indication observed', 'An ordinary indication of electricity supply was observed at the checked location. This does not establish electrical safety throughout the property.'), option('Water supply checked', 'Water was available at the selected tap when checked. Other parts of the water system were not assessed.')],
  [option('Power unavailable', 'Electricity was unavailable at the checked location during the visit. The cause has not been confirmed.'), option('Water unavailable', 'Water was unavailable at the selected tap when checked. The cause has not been confirmed.')],
  [option('Controls inaccessible', 'Utility status could not be verified because the relevant controls or equipment were inaccessible.'), option('Safety restriction', 'Utility status could not be verified safely following the incident.')]),
 'Emergency shutoff required': group(
  [option('Shutoff completed as instructed', 'The specified utility shutoff was completed in accordance with confirmed instructions.'), option('Responder confirmed no shutoff needed', 'The attending responder confirmed that a utility shutoff was not required at the time of assessment.')],
  [option('Shutoff awaiting responder', 'A utility shutoff has been requested and is awaiting the appropriate responder. It has not been performed by staff.'), option('Shutoff could not be completed', 'A required utility shutoff could not be completed.')],
  [option('Need for shutoff undetermined', 'The need for a utility shutoff could not be determined safely by staff. Assessment by an appropriate responder is pending.'), option('Shutoff control inaccessible', 'The relevant shutoff control was inaccessible. Whether a shutoff is required remains unverified.')]),
 'Temporary protective action taken': group(
  [option('Access restricted', 'Access to the affected area was restricted as a temporary precaution.'), option('Evacuation confirmed', 'Evacuation of the property was confirmed. Re-entry safety remains subject to the appropriate assessment.'), option('Property secured', 'The accessible entrances checked by staff were secured before departure. Inaccessible or damaged areas are addressed separately in the visit record.')],
  [option('Further protection required', 'Further protective measures are required and remain pending.'), option('Unable to secure affected area', 'The affected area could not be secured during this visit. Further assistance is required.')],
  [option('Unsafe to carry out action', 'Temporary protective work could not be undertaken safely by staff. Appropriate assistance is required.'), option('Instructions not confirmed', 'Protective action was not undertaken because the required instructions or authorization had not been confirmed.')]),
 'Contractor / technician required': group(
  [option('Crew confirmed on the way', 'The responding crew confirmed that they are on the way.'), option('Contractor attendance confirmed', 'Contractor attendance was confirmed.'), option('Attending specialist on site', 'The attending specialist was on site at the time of the visit.')],
  [option('Assistance requested; unconfirmed', 'Specialist assistance has been requested, but attendance has not yet been confirmed.'), option('Unable to arrange attendance', 'Specialist attendance could not be arranged during this visit. Further coordination remains outstanding.')],
  [option('Specialist requirement undetermined', 'The specialist assistance required could not be determined from the accessible observations. Further assessment is pending.'), option('Provider not reached', 'The intended provider could not be reached to confirm availability or attendance.')]),
 'Photos / evidence collected': group(
  [option('Incident photos attached', 'Incident photographs were taken and attached to this visit record.'), option('Existing incident photos referenced', 'The incident photographs already attached to this visit record are referenced for this finding; no duplicate photographs were added.')],
  [option('Photo coverage incomplete', 'Photographic documentation is incomplete.')],
  [option('Unsafe to photograph', 'Photographs of the affected area could not be taken safely.'), option('Equipment unavailable', 'Photographs could not be taken because suitable recording equipment was unavailable at the time of the visit.')]),
 'Owner contacted / update required': group(
  [option('Owner reached by phone', 'The owner was reached by phone and informed of the incident and current observations.'), option('Written update sent', 'A written update about the incident was sent to the owner. Receipt has not been confirmed unless recorded separately.'), option('Owner acknowledged update', 'The owner acknowledged receipt of the incident update.')],
  [option('Contact attempted; no response', 'Contact with the owner was attempted, but no response had been received at the time of this entry.'), option('Further owner decision needed', 'A further decision from the owner is required.')],
  [option('Contact details unavailable', 'The owner could not be contacted because usable contact details were unavailable.'), option('Communication service unavailable', 'The owner could not be contacted because communication service was unavailable during the visit.')]),
 'Additional emergency notes': group(
  [option('No additional information', 'No additional information was available at the time this visit record was completed.'), option('Assessment update pending', 'A further update is pending the attending specialist assessment. The extent of damage and further work required remain unconfirmed.')],
  [option('Outstanding follow-up', 'Further follow-up is required.')],
  [option('Information not yet available', 'Further incident information could not be confirmed because the relevant assessment or report was not yet available.')],
  'No additional emergency notes apply to this visit.'),
};

export function suggestedAnswers(visitType, name, status) {
 if (visitType !== 'Emergency Visit' || !Object.hasOwn(EMERGENCY_SUGGESTED_ANSWERS, name)) return [];
 const item = EMERGENCY_SUGGESTED_ANSWERS[name];
 if (status === 'Normal') return item.normal;
 if (status === 'Important' || status === 'Emergency') return item.concern;
 if (status === 'Unable to Check') return item.unable;
 if (status === 'N/A') return [option('Outside this visit’s scope', item.na)];
 return [];
}
export function applySuggestedAnswer(item, text) {
 const existing = item.notes || '';
 const duplicate = existing.split('\n').some(line => line.trim() === text.trim());
 return { ...item, notes: duplicate ? existing : (existing.trim() ? existing + '\n' + text : text),
   // A fresh suggested description is for the owner report. Existing private
   // notes stay private: never expose previously written material implicitly.
   owner_visible: existing.trim() ? item.owner_visible : true };
}
