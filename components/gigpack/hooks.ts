// Mock hooks for next-intl until full i18n is set up
export function useTranslations(namespace: string) {
  const messages: Record<string, string> = {
    // Public View Keys
    "rehearsalMode": "Rehearsal Mode",
    "stageView": "Stage View",
    "statusActive": "Live",
    "statusIdle": "Idle",
    "statusLive": "Live",
    
    // Gig Types
    "gigTypeWedding": "Wedding",
    "gigTypeClubShow": "Club Show",
    "gigTypeCorporate": "Corporate",
    "gigTypeBarGig": "Bar Gig",
    "gigTypeCoffeeHouse": "Coffee House",
    "gigTypeFestival": "Festival",
    "gigTypeRehearsal": "Rehearsal",
    "gigTypeOther": "Other",

    // Labels
    "callLabel": "Call:",
    "stageLabel": "Stage:",
    "schedule": "Schedule",
    "logistics": "Logistics",
    "dressCodeLabel": "Dress Code",
    "gearLabel": "Backline / Gear",
    "parkingLabel": "Parking",
    "whosPlaying": "Who's Playing",
    "setlist": "Setlist",
    "showMore": "Show {count} more",
    "showLess": "Show less",
    "showFullSetlist": "Show Full Setlist",
    "materials": "Materials",
    "materialTypeRehearsal": "Rehearsal",
    "materialTypePerformance": "Performance",
    "materialTypeCharts": "Charts",
    "materialTypeReference": "Reference",
    "materialTypeOther": "Other",
    "openMaterial": "Open",

    // Rehearsal View
    "date": "DATE",
    "callTime": "CALL TIME",
    "onStage": "ON STAGE",
    "venue": "VENUE",
    "openInMaps": "Open in Maps",
    "essentialInfo": "ESSENTIAL INFO",
    "dressCode": "DRESS CODE",
    "gear": "GEAR / BACKLINE",
    "stageViewFooter": "GigMaster Stage View",
  };

  return (key: string, params?: any) => {
    let msg = messages[key] || key;
    if (params) {
       Object.keys(params).forEach(k => {
         msg = msg.replace(`{${k}}`, params[k]);
       });
    }
    return msg;
  };
}

export function useLocale() {
  return "en";
}

