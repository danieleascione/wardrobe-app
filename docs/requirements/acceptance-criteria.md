# PocketWardrobe MVP — Acceptance Criteria (BDD Gherkin)

**Format**: Full Given-When-Then per story
**Traceability**: Each scenario ID maps to a user story in `user-stories.md`
**Real data**: All scenarios use realistic personas and data (no user123 or test@test.com)

---

## US-01: First-Time Style Calibration

### AC-01-01: Successful calibration creates a personalized style profile

```gherkin
Scenario: Sofia completes style calibration and her profile is saved
  Given Sofia has installed PocketWardrobe and opened it for the first time
  And she has not previously completed any style onboarding
  When she selects "Classic" as her style archetype
  And she selects "Work" and "Casual" as her occasion priorities
  And she selects "Neutral palette" as her color preference
  And she taps "Start adding clothes"
  Then her style_profile is saved with:
    | archetype  | classic               |
    | occasions  | ["work", "casual"]    |
    | palette    | neutral               |
  And she is navigated to the item capture screen
  And the progress indicator shows "0 of 5 — add 5 to see your first outfit"
  And the calibration screen is not shown again on next launch
```

### AC-01-02: Skipped calibration applies default profile

```gherkin
Scenario: Marco dismisses style calibration and receives a default profile
  Given Marco has installed PocketWardrobe and opened it for the first time
  When he taps the X to dismiss the style calibration screen
  Then a default style_profile is created with:
    | archetype  | classic               |
    | occasions  | ["work", "casual"]    |
    | palette    | neutral               |
  And he is navigated to the item capture screen
  And a banner reads "Complete your style profile for better suggestions"
  And tapping the banner opens the style calibration screen
```

### AC-01-03: Updated calibration overwrites previous profile

```gherkin
Scenario: Sofia updates her style profile 2 weeks after onboarding
  Given Sofia completed style calibration 14 days ago with archetype="classic"
  And she navigates to Settings > Style Profile
  When she changes her style archetype to "Minimalist"
  And saves the change
  Then her style_profile updates to archetype="minimalist"
  And the next daily outfit suggestion uses the updated archetype
  And her wardrobe item data (category, occasion_tags) is unchanged
```

---

## US-02: Camera-Based Item Digitization

### AC-02-01: Successful photo capture and AI classification

```gherkin
Scenario: Sofia photographs her camel trench coat and AI classifies it correctly
  Given Sofia is on the item capture screen
  And her wardrobe has 0 confirmed items
  When she captures a well-lit photo of her camel trench coat laid flat
  Then the photo is submitted for AI processing
  And within 10 seconds, she sees a processing screen showing:
    | step                      | status    |
    | Background removed        | complete  |
    | Color detected            | complete  |
    | Category identified       | complete  |
    | Occasion tags suggested   | complete  |
  And she sees the background-removed image of her coat
  And the pre-filled metadata shows:
    | field          | value                        |
    | color_primary  | Camel / Warm tan             |
    | category       | Outerwear                    |
    | subcategory    | Coat                         |
    | season         | Spring/Autumn, Winter        |
    | occasion_tags  | Work, Casual                 |
    | name           | Camel Wool Coat              |
  And all fields are editable before confirmation
  And a single "Add to wardrobe" button is displayed
```

### AC-02-02: Low lighting detected — retake prompt shown before AI submission

```gherkin
Scenario: Sofia photographs her coat in insufficient lighting
  Given Sofia is on the item capture screen
  When she captures a photo in a room with lighting below threshold
  Then the photo is NOT submitted to AI processing
  And a prompt appears: "This photo looks a bit dark — retake for better results?"
  And two options are shown: "Retake" and "Use anyway"
  When Sofia taps "Retake"
  Then the camera view is shown again for a new capture
  When Sofia instead taps "Use anyway"
  Then the dark photo is submitted for AI processing and the normal flow continues
```

### AC-02-03: AI category error — Sofia corrects it manually

```gherkin
Scenario: Sofia corrects an AI misclassified category before saving
  Given Sofia's linen blazer photo has been processed by AI
  And AI has classified the category as "Tops → Blouse"
  When Sofia reviews the pre-filled metadata
  And she taps the category field
  And selects "Outerwear → Blazer" from the picker
  Then the category field updates to "Outerwear → Blazer"
  And when she taps "Add to wardrobe"
  Then the item_record is saved with category="Outerwear" and subcategory="Blazer"
  And manual_classification is set to true
```

### AC-02-04: Network loss during upload — queue and retry

```gherkin
Scenario: Upload fails mid-session due to lost network connection
  Given Sofia has captured and confirmed metadata for her white silk blouse
  And her network connection drops before the upload completes
  When the upload attempt fails
  Then the app shows "Upload paused — we'll retry when you're back online"
  And the photo and metadata are stored locally on her device
  And no item_record is created in the wardrobe (item_count is unchanged)
  When her network connection is restored
  Then the upload automatically retries without any action from Sofia
  And the item_record is created and item_count increments
  And Sofia does not need to re-photograph or re-enter metadata for the blouse
```

### AC-02-05: Gallery import instead of camera capture

### AC-02-06: AI returns high-confidence but incorrect classification — correction tracked

```gherkin
Scenario: AI classifies item with high confidence but Sofia corrects it after review
  Given Sofia's photo of a blazer has been processed
  And AI returns category="Tops → Blouse" with confidence score 0.87 (above auto-accept threshold)
  And the metadata is pre-filled as if the classification were correct
  When Sofia reviews the metadata and corrects category to "Outerwear → Blazer"
  And taps "Add to wardrobe"
  Then the item is saved with manual_classification = true
  And the correction (predicted="Tops → Blouse", corrected="Outerwear → Blazer", confidence=0.87) is logged to the AI improvement pipeline
  And the item's worn_count starts at 0 (no impact from misclassification)

Scenario: User's correction rate for a category exceeds the monitoring threshold
  Given 20 beta users have photographed knitwear items
  And 6 of those items (30%) were corrected from "Tops → T-shirt" to "Tops → Knitwear"
  Then the AI quality monitoring system records a correction rate of 30% for the "knitwear" subcategory
  And the monitoring dashboard shows an alert for the engineering team
  And the engineering team reviews the training data for knitwear classification
```

---

### AC-02-05: Gallery import instead of camera capture
  Given Sofia is on the item capture screen
  When she taps "From gallery"
  And selects an existing photo of her dark slim jeans from her camera roll
  Then the photo is submitted for AI processing identically to a camera capture
  And within 10 seconds she sees the pre-filled metadata for the jeans
  And the category shows "Bottoms → Jeans"
  And occasion_tags show "Work" and "Casual"
  And she can confirm or edit before adding to wardrobe
```

---

## US-03: Progress-Driven Wardrobe Building to First Outfit

### AC-03-01: Progress indicator updates correctly after each item

```gherkin
Scenario: Progress bar reflects confirmed item count accurately
  Given Sofia's wardrobe has 2 confirmed items
  And 1 item upload is in progress (pending)
  When she views the wardrobe grid
  Then the progress bar shows "2 of 5"
  And the pending upload item does NOT contribute to the 2 count
  When the pending upload completes successfully
  Then the progress bar updates to "3 of 5" without requiring a page refresh
```

### AC-03-02: 5th item triggers celebration and first outfit reveal

```gherkin
Scenario: Sofia adds her 5th item and transitions to her first outfit
  Given Sofia has 4 confirmed items in her wardrobe
  And this is her first time reaching the 5-item threshold
  When she confirms her 5th item (camel knit turtleneck)
  Then the progress bar completes with a celebration animation
  And within 2 seconds, the screen transitions to the first outfit suggestion
  And the first outfit suggestion is composed from her 5 wardrobe items
  And the celebration animation does not replay on any subsequent item additions
```

### AC-03-03: Progress persists between sessions

```gherkin
Scenario: Sofia resumes digitization in a second session
  Given Sofia added 3 items in a session on Sunday evening
  And she closed the app before adding the 5th item
  When she reopens PocketWardrobe on Monday morning
  Then the progress bar shows "3 of 5"
  And she can continue adding items from where she left off
  And no data from the first session is lost
```

### AC-03-04: Occasion mismatch at the 5-item threshold

```gherkin
Scenario: Sofia reaches 5 items but none are tagged for her primary occasion
  Given Sofia's style_profile primary occasion is "Work"
  And all 5 of her wardrobe items are tagged "Casual" only
  When she adds her 5th item and the outfit trigger fires
  Then the app generates a casual outfit from her 5 items
  And the outfit card shows occasion label "Casual"
  And a message reads "Add one work-appropriate item to get your first work outfit"
  And the outfit is still presented — no error or empty state is shown
```

---

## US-04: Occasion and Weather-Aware Outfit Suggestion

### AC-04-01: Work outfit with cold weather context

```gherkin
Scenario: Sofia sees a winter work outfit suggestion with weather context
  Given Sofia has 12 items in her wardrobe including outerwear and formal pieces
  And her style_profile primary occasion is "Work"
  And tomorrow's weather in Milan is 7 degrees Celsius, partly cloudy
  When Sofia opens the app to view tomorrow's outfit
  Then she sees a complete outfit combining a coat, structured top, and trousers from her wardrobe
  And the card displays "Milan, 7°C, partly cloudy"
  And the occasion label shows "Work"
  And the outfit card includes a reasoning field of 1-2 sentences that references at least one of: weather condition, temperature, occasion label, or color relationship of the items
  And all outfit items are confirmed items from her wardrobe
```

### AC-04-02: Sofia overrides occasion for today

```gherkin
Scenario: Sofia changes today's occasion from Work to Casual for a Saturday
  Given Sofia's default occasion is "Work"
  And she is planning Saturday's outfit
  When she taps the occasion label on the outfit card
  And selects "Casual" from the occasion picker
  Then the outfit regenerates using casual-tagged items from her wardrobe
  And the card updates with a casual combination
  And her style_profile default occasion remains "Work" (the override is today only)
  When she opens the app on Sunday
  Then the default occasion is "Work" again
```

### AC-04-03: Outfit avoids repetition from the past 7 days

```gherkin
Scenario: Rotation engine avoids repeating Monday's exact outfit on Tuesday
  Given Sofia wore (accepted) coat + white blouse + dark slim jeans on Monday
  And it is now Tuesday
  When the app generates Tuesday's outfit suggestion
  Then the exact combination of coat + white blouse + dark slim jeans is NOT suggested
  And at least one item in Tuesday's outfit differs from Monday's suggestion
  And Tuesday's outfit still respects her "Work" occasion and "Classic" style
```

### AC-04-04: Weather API failure — graceful degradation

```gherkin
Scenario: Weather API is unavailable during outfit generation
  Given Sofia's wardrobe has 20 items
  And the weather service returns a timeout error when called
  When the app generates today's outfit suggestion
  Then a complete outfit is still shown to Sofia
  And the weather section displays "Weather info unavailable today"
  And the occasion label still shows "Work"
  And no error message or blocking screen is shown
  And the outfit can be accepted, swapped, or shared normally
```

### AC-04-05: First daily outfit of a new day is different from yesterday's

```gherkin
Scenario: Sofia's Monday outfit is different from Sunday's
  Given Sofia accepted an outfit on Sunday (blouse + jeans + sneakers)
  When Sofia opens the app on Monday morning
  Then the Monday outfit suggestion is different from Sunday's
  And the Monday outfit reflects the weather context for Monday in Milan
  And Sunday's outfit is logged in outfit_history and not repeated this week
```

### AC-04-06: Seasonal/weather filter eliminates all wardrobe items — graceful fallback

```gherkin
Scenario: Sofia's wardrobe contains only summer items but it is winter
  Given Sofia's wardrobe has 15 items all tagged season=["spring", "summer"]
  And today's weather in Milan is 3 degrees Celsius, snowing
  And the outfit engine applies winter seasonal filtering
  When the outfit engine finds zero items matching the winter season filter
  Then the app does not show an error or empty screen
  And instead shows the best available outfit without seasonal filtering applied
  And the outfit card displays "Your wardrobe is optimized for warmer weather — here is our best suggestion for today"
  And the card includes a prompt "Add winter items to your wardrobe"
```

---

## US-05: Item Swap Within Daily Outfit

### AC-05-01: Successful item swap in outfit

```gherkin
Scenario: Sofia swaps suggested loafers for her ankle boots
  Given Sofia is viewing her Tuesday outfit suggestion
  And the outfit includes brown loafers
  And her wardrobe contains 4 footwear items including black ankle boots
  When she taps on the loafers in the outfit visualization
  Then a bottom drawer opens showing her 4 footwear items
  And the current loafers are highlighted as "currently selected"
  When she taps her black ankle boots
  Then the drawer closes
  And the outfit visualization updates to show the ankle boots within 1 second
  And the outfit can now be saved with the ankle boots as the accepted footwear
```

### AC-05-02: Only one item in the swapped category

```gherkin
Scenario: Sofia tries to swap her coat but only owns one coat
  Given Sofia is viewing her daily outfit
  And the outfit includes her camel trench coat
  And her wardrobe contains exactly 1 coat
  When she taps the coat in the outfit visualization
  Then a bottom drawer opens showing only the camel trench coat
  And a message reads "You only have one coat — add more to your wardrobe for variety"
  And an "Add items" link navigates to the item capture screen
  And the coat remains in the outfit — no empty state is shown
```

### AC-05-03: Modified outfit is saved as a wear event with swapped items

```gherkin
Scenario: Sofia saves a modified outfit after swapping shoes
  Given Sofia swapped the suggested loafers for her ankle boots in the outfit
  And the outfit now shows: camel coat + white blouse + dark jeans + ankle boots
  When Sofia taps "This works for me"
  Then a wear_event is created with:
    | date         | today's date                                          |
    | items_worn   | [camel coat id, white blouse id, dark jeans id, ankle boots id] |
  And the worn_count for each item in items_worn increments by 1
  And the original outfit_suggestion record is unchanged
  And item_record.last_worn_at updates for each worn item
```

---

## US-06: Daily Outfit Habit and Unworn Item Awareness

### AC-06-01: Unworn items tracker appears after eligibility threshold

```gherkin
Scenario: Unworn items stat does not appear for a new user with 8 items
  Given Sofia has been using PocketWardrobe for 4 days
  And her wardrobe has 8 confirmed items
  When she views the daily outfit card
  Then the "Unworn this month" stat is NOT displayed
  And no stats section is shown in the outfit card footer
```

```gherkin
Scenario: Unworn items stat appears after 15 items and 7 days of use
  Given Sofia has been using PocketWardrobe for 10 days
  And her wardrobe has 18 confirmed items
  And 11 of those items have 0 wear events in the past 30 days
  And those 11 items were all added more than 14 days ago
  When she views the daily outfit card
  Then the outfit card footer shows "Your wardrobe: 18 items"
  And "Unworn this month: 11 items" with a tappable link
```

### AC-06-02: Tapping an unworn item generates an outfit featuring it

```gherkin
Scenario: Sofia generates an outfit centered on her forgotten mustard blazer
  Given Sofia's wardrobe has 23 items
  And her mustard yellow blazer has 0 wear events in the past 30 days
  And she is viewing her unworn items grid
  When she taps on the mustard yellow blazer
  Then the outfit suggestion engine generates an outfit that includes the mustard blazer
  And the blazer is shown as the "focus piece" in the outfit visualization
  And other outfit items complement the blazer's color and occasion tags
  And the outfit card includes the weather context for today
```

### AC-06-03: All items worn this month — positive reinforcement shown

```gherkin
Scenario: Sofia has worn all her wardrobe items in the past 30 days
  Given Sofia's wardrobe has 15 confirmed items
  And all 15 items have at least 1 wear event in the past 30 days
  When she views the daily outfit card
  Then the footer shows "Your wardrobe: 15 items"
  And instead of an unworn stat, it shows "Your wardrobe is working hard"
  And no link to "see what you haven't worn" is displayed
```

---

## Property-Shaped Acceptance Criteria

### @property: Outfit suggestion performance under scale

```gherkin
@property
Scenario: Outfit suggestion generates within 3 seconds regardless of wardrobe size
  Given a user has between 5 and 200 confirmed items in their wardrobe
  Then outfit suggestions are generated and displayed within 3 seconds at the 95th percentile
  And at no wardrobe size does outfit generation exceed 8 seconds
```

### @property: item_record data consistency across sessions

```gherkin
@property
Scenario: Item metadata is stable and consistent across all display contexts
  Given an item has been saved with color="Camel" and category="Outerwear → Coat"
  Then every context that displays this item (wardrobe grid, outfit card, swap drawer, unworn items grid) shows the same color and category
  And no session shows different metadata for the same item_id without an explicit user edit
```

### @property: Weather context does not show stale data

```gherkin
@property
Scenario: Weather context is always for the current day
  Given a user views their outfit card at any time during a day
  Then the weather context displayed matches the current day's forecast for their registered location
  And a weather context from a previous day is never shown on today's outfit card
```
