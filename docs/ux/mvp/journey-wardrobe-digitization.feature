Feature: Wardrobe Digitization and Daily Outfit Suggestion
  As Sofia, a fashion-conscious professional who owns many clothes but struggles to combine them,
  I want to digitize my wardrobe and receive intelligent daily outfit suggestions,
  So that I feel confident and decisive when getting dressed without buying more clothes.

  Background:
    Given the PocketWardrobe app is installed on Sofia's iPhone
    And Sofia's location is set to Milan, Italy
    And the weather service is available and returns current conditions

  # ─────────────────────────────────────────────────────────────────
  # STEP 1: Style Onboarding
  # ─────────────────────────────────────────────────────────────────

  Scenario: Sofia completes style calibration on first launch
    Given Sofia opens PocketWardrobe for the first time
    And she has not previously completed style onboarding
    When she selects "Classic" as her style archetype
    And she selects "Work" and "Casual" as her occasion priorities
    And she selects "Neutral palette" as her color preference
    Then her style_profile is saved with archetype="classic", occasions=["work","casual"], palette="neutral"
    And she is navigated to the item capture screen
    And the progress indicator shows "0 of 5 items — add 5 to see your first outfit"

  Scenario: Sofia skips to adding items without completing all questions
    Given Sofia opens PocketWardrobe for the first time
    When she dismisses the style calibration screen
    Then she is navigated to the item capture screen with a default style profile
    And the default profile uses archetype="classic", occasions=["work","casual"], palette="neutral"
    And a banner offers to "Complete your style profile for better suggestions"

  # ─────────────────────────────────────────────────────────────────
  # STEP 2: Item Photography
  # ─────────────────────────────────────────────────────────────────

  Scenario: Sofia photographs her camel coat successfully
    Given Sofia is on the item capture screen
    And the progress indicator shows "0 of 5"
    When she captures a well-lit photo of her camel trench coat laid flat
    Then the photo is submitted for AI processing
    And she sees an animated processing screen with step-by-step status
    And each processing step is shown with a checkmark as it completes

  Scenario: Sofia's photo has insufficient lighting
    Given Sofia is on the item capture screen
    When she captures a photo in a dimly lit room
    And the app assesses lighting quality as below threshold
    Then the app shows "This photo looks a bit dark — retake for better results?"
    And presents "Retake" and "Use anyway" options
    And does not proceed to AI processing until Sofia makes a choice

  Scenario: Sofia photographs directly from her photo gallery
    Given Sofia is on the item capture screen
    When she taps "From gallery"
    And selects an existing photo of a white silk blouse
    Then the photo is submitted for AI processing
    And the flow continues identically to camera capture

  # ─────────────────────────────────────────────────────────────────
  # STEP 3: AI Processing & Metadata Review
  # ─────────────────────────────────────────────────────────────────

  Scenario: AI correctly classifies Sofia's camel trench coat
    Given Sofia's camel coat photo has been submitted for processing
    When AI processing completes within 5 seconds
    Then Sofia sees the background-removed image of her coat
    And the detected color displays as "Camel / Warm tan"
    And the category shows "Outerwear → Coat"
    And season is pre-selected as "Spring/Autumn" and "Winter"
    And occasion tags show "Work" and "Casual" pre-checked
    And an editable name field shows "Camel Wool Coat"
    And a single "Add to wardrobe" call-to-action is displayed

  Scenario: Sofia corrects the AI-detected category
    Given AI has classified an item as "Tops → T-shirt"
    And the actual item is a "Tops → Blouse"
    When Sofia taps the category field
    And selects "Tops → Blouse" from the picker
    Then the item is saved with the corrected subcategory
    And the correction is submitted to the AI improvement pipeline

  Scenario: Sofia corrects the AI-detected primary color
    Given AI has detected the primary color as "Brown"
    And Sofia's coat is actually "Camel / Warm tan"
    When Sofia taps the color field and selects "Camel"
    Then the item_record stores color_primary = "Camel"
    And the outfit engine uses the corrected color for future matching

  Scenario: AI processing exceeds 10 seconds
    Given Sofia's photo has been submitted for AI processing
    When processing takes longer than 10 seconds
    Then the app shows "Taking a moment longer than usual..."
    And continues processing without timing out
    And if processing exceeds 30 seconds, shows "We'll notify you when it's ready"
    And sends a push notification when processing completes

  Scenario: AI completely fails to classify the item
    Given Sofia's photo shows an unusual textile item
    When AI processing completes with confidence below minimum threshold
    Then the app shows "We couldn't identify this item automatically — what is it?"
    And presents a full category picker with search
    And Sofia selects the category manually
    And the item is saved with manual_classification = true

  # ─────────────────────────────────────────────────────────────────
  # STEP 4: Building the Wardrobe (Items 2-5)
  # ─────────────────────────────────────────────────────────────────

  Scenario: Sofia adds her 4th item and sees personalized encouragement
    Given Sofia has confirmed 3 items in her wardrobe (coat, blouse, dark jeans)
    When she confirms her 4th item (black ankle boots)
    Then the wardrobe grid shows 4 items
    And the progress bar shows 4 of 5
    And the message reads "Sofia, we're learning your style as you add more items"
    And the "Add another item" button is clearly visible

  Scenario: Sofia's 5th item triggers the transition to first outfit
    Given Sofia has 4 confirmed items in her wardrobe
    When she confirms her 5th item (camel knit turtleneck)
    Then the progress bar completes with a celebration animation
    And the app transitions to the first outfit suggestion screen within 2 seconds
    And the transition shows items animating into an outfit composition

  # ─────────────────────────────────────────────────────────────────
  # STEP 5: First Outfit Suggestion — The Aha Moment
  # ─────────────────────────────────────────────────────────────────

  Scenario: Sofia receives her first complete outfit suggestion
    Given Sofia has 5 items in her wardrobe
    And her style_profile is archetype="classic", occasions=["work","casual"]
    And tomorrow's weather in Milan is 9 degrees Celsius, partly cloudy
    When the outfit suggestion engine runs
    Then Sofia sees a full-screen outfit visualization
    And the outfit includes at least 3 of her wardrobe items
    And the card header shows "Monday's Outfit"
    And weather context shows "Milan, 9°C, partly cloudy"
    And the occasion shows "Work"
    And a "Why this works" explanation describes the color harmony and occasion fit
    And three actions are available: "Try another", "Save this outfit", "Share"

  Scenario: Sofia requests an alternative outfit from her wardrobe
    Given Sofia sees her first outfit suggestion (coat + blouse + jeans)
    When she taps "Try another"
    Then the app generates a different combination of her 5 wardrobe items
    And the new combination does not repeat the exact same item set
    And it still respects her "Classic" style archetype and "Work" occasion
    And the original suggestion is logged as "not selected"

  Scenario: Sofia shares her first outfit visualization
    Given Sofia has accepted her first outfit suggestion
    When she taps "Share"
    Then the outfit visualization is rendered as a shareable image
    And includes a "Styled with PocketWardrobe" attribution
    And the share sheet opens with the rendered image

  Scenario: Weather API is unavailable during first outfit generation
    Given Sofia has 5 items in her wardrobe
    And the weather API returns a connection error
    When the outfit is generated
    Then Sofia still sees a complete outfit suggestion
    And the weather section shows "Weather info unavailable today"
    And the outfit is still contextualized to her "Work" occasion

  Scenario: Wardrobe has 5 items but none tagged for the primary occasion
    Given Sofia has 5 casual-tagged items only
    And her style_profile primary occasion is "Work"
    When the first outfit is generated
    Then the app uses the available items for a casual outfit
    And shows "Add one work item to get your first work outfit suggestion"
    And the current outfit is labeled "Casual" rather than "Work"

  # ─────────────────────────────────────────────────────────────────
  # STEP 6: Daily Return Loop
  # ─────────────────────────────────────────────────────────────────

  Scenario: Sofia returns on a new day for her daily outfit
    Given Sofia has had PocketWardrobe for 3 days
    And her wardrobe has 12 items
    When she opens the app on Tuesday morning
    Then she sees "Good morning, Sofia"
    And Tuesday's weather for Milan is displayed
    And a complete outfit different from Monday's is shown
    And the occasion matches her work occasion preference
    And her wardrobe count "12 items" is visible

  Scenario: Sofia swaps one item in her daily outfit
    Given Sofia sees her Tuesday outfit with suggested loafers
    And she prefers to wear her ankle boots today
    When she taps on the shoe item in the outfit
    Then she sees all footwear items from her wardrobe
    And she selects her black ankle boots
    Then the outfit updates to show the ankle boots
    And she can save the modified outfit

  Scenario: Sofia views her unworn items
    Given Sofia has 23 items in her wardrobe
    And 14 of those items have a worn_count of 0 in the past 30 days
    When Sofia taps "See what you haven't worn"
    Then she sees a grid of her 14 unworn items
    And each item card shows the number of days since it was last worn
    And each item can be tapped to generate an outfit featuring that item

  Scenario: Daily outfit suggestion avoids exact repetition
    Given Sofia accepted the same coat + blouse + jeans combination on Monday
    And it is now Thursday
    When the Thursday outfit is generated
    Then the exact combination of coat + blouse + jeans is not suggested again
    And the suggestion uses at least one different item from Monday's outfit

  @property
  Scenario: Outfit suggestion response time is consistently fast
    Given Sofia has up to 200 items in her wardrobe
    Then outfit suggestions are generated and displayed within 3 seconds
    And the visual transition from loading to outfit card feels instant

  @property
  Scenario: AI item recognition data is consistent across sessions
    Given Sofia's camel coat has been saved with color = "Camel" and category = "Outerwear → Coat"
    Then every session that renders this item displays the same color and category
    And no session shows different metadata for the same item_id

  # ─────────────────────────────────────────────────────────────────
  # ERROR PATHS — SHARED
  # ─────────────────────────────────────────────────────────────────

  Scenario: Network connection lost during item upload
    Given Sofia has captured a photo of her blouse
    And her network connection drops before upload completes
    When the upload fails
    Then the app shows "Upload paused — we'll retry when you're back online"
    And the photo is stored locally for retry
    And when the network returns, the upload resumes automatically
    And Sofia does not need to re-photograph the item

  Scenario: Sofia's wardrobe grows to 200+ items — search becomes necessary
    Given Sofia has 200 items in her wardrobe
    When she opens her wardrobe grid view
    Then a search bar is prominently available at the top
    And she can filter items by category, color, season, or occasion
    And filtered results update in real time as she types or selects filters
