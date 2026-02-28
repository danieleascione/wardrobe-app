@milestone_4
Feature: Occasion and weather-aware daily outfit suggestion
  As a regular PocketWardrobe user
  I want a daily outfit suggestion that accounts for my plans and the weather
  So that I feel confidently dressed for my actual day without spending time deciding

  # US-04: Occasion and Weather-Aware Outfit Suggestion
  # Driving port: OutfitSuggestionPort
  # Queries: GetDailyOutfit(userId, date, occasionOverride?)
  # Commands: AcceptOutfit(userId, outfitId, finalItemIds)
  # Mocked outbound: WeatherServicePort, WardrobeRepository

  Background:
    Given Sofia has 12 confirmed items in her wardrobe including outerwear and formal pieces
    And her style profile primary occasion is "Work" and archetype is "Classic"

  @smoke
  Scenario: Sofia sees a work outfit suited to cold Milan weather
    Given tomorrow's forecast in Milan is 7 degrees Celsius and partly cloudy
    When Sofia opens the app to view tomorrow's outfit
    Then she sees a complete outfit combining a coat, structured top, and trousers from her wardrobe
    And the outfit card shows "Milan, 7°C, partly cloudy"
    And the occasion label shows "Work"
    And the outfit card includes a short explanation referencing the weather or occasion
    And all items in the outfit are from her confirmed wardrobe

  @smoke
  Scenario: Weather service is unavailable and Sofia still receives a full outfit
    Given the weather service is not reachable today
    When the app generates today's outfit suggestion
    Then a complete outfit is still shown to Sofia
    And the outfit card shows "Weather info unavailable today"
    And the occasion label still shows "Work"
    And no error screen or empty state is shown
    And Sofia can accept, swap, or dismiss the outfit normally

  @edge-case
  Scenario: Sofia overrides the occasion to Casual for a Saturday
    Given Sofia's default occasion is "Work"
    And today is Saturday
    When she taps the occasion label on the outfit card
    And selects "Casual" from the occasion picker
    Then the outfit regenerates using casual-tagged items from her wardrobe
    And the outfit card shows occasion label "Casual"
    And her style profile default occasion remains "Work"

  @edge-case
  Scenario: Sunday's occasion override resets on Monday
    Given Sofia overrode today's occasion to "Casual"
    When she opens the app the following day
    Then the default occasion "Work" is used for the new day's suggestion
    And no occasion override carries over from the previous day

  @edge-case
  Scenario: The rotation engine avoids repeating Monday's outfit on Tuesday
    Given Sofia accepted coat + white blouse + dark slim trousers on Monday
    When the app generates Tuesday's outfit suggestion
    Then the exact combination of coat + white blouse + dark slim trousers is not suggested again
    And at least one item in Tuesday's outfit differs from Monday's
    And Tuesday's outfit still reflects her "Work" occasion and "Classic" style

  @pending
  @edge-case
  Scenario: All wardrobe items match only summer seasons but it is winter
    Given Sofia's wardrobe has 15 items all tagged for spring and summer seasons
    And today's forecast in Milan is 3 degrees Celsius and snowing
    When the outfit suggestion is generated
    Then a complete outfit is still shown to Sofia
    And the outfit card shows "Your wardrobe is optimised for warmer weather — here is our best suggestion for today"
    And a prompt is visible to add winter items to her wardrobe
    And no error or empty screen is shown

  @pending
  @edge-case
  Scenario: Mild spring weather produces a lighter outfit than cold winter weather
    Given Sofia has items suitable for both warm and cold weather
    And tomorrow's forecast in Milan is 18 degrees Celsius and sunny
    When she views tomorrow's outfit suggestion
    Then the outfit does not include heavy winter outerwear
    And the outfit card shows "Milan, 18°C, sunny"

  @pending
  @error-path
  Scenario: No items in Sofia's wardrobe are tagged for her requested occasion
    Given Sofia's wardrobe has 10 items all tagged "Sport" only
    And her requested occasion is "Work"
    When the outfit suggestion is generated
    Then an outfit is still shown using the best available items
    And the outfit card shows a message explaining that she has no work-tagged items
    And a prompt suggests tagging items for "Work" to improve suggestions

  @pending
  @error-path
  Scenario: Outfit cannot be generated because wardrobe has fewer than 5 items
    Given Sofia's wardrobe has 3 confirmed items
    When the outfit suggestion is requested
    Then no outfit suggestion is shown
    And the progress indicator prompts her to add 2 more items to unlock her first outfit

  @pending
  @property
  Scenario: Outfit suggestion always contains at least 3 items regardless of wardrobe size
    Given a wardrobe with between 5 and 200 confirmed items
    When an outfit suggestion is generated
    Then the suggestion contains at least 3 items

  @pending
  @property
  Scenario: Exact outfit combinations are not repeated within the rotation window
    Given a wardrobe with 15 or more confirmed items
    And an outfit was accepted on any day within the past 7 days
    When the next outfit suggestion is generated
    Then the exact same combination of items is not suggested again within that 7-day window
