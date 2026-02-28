@milestone_3
Feature: Progress indicator and first outfit unlock at 5 items
  As a first-time PocketWardrobe user mid-digitisation
  I want to see my progress toward the first outfit
  So that I have a clear goal that keeps me motivated to add more clothes

  # US-03: Progress-Driven Wardrobe Building to First Outfit
  # Driving port: WardrobeQueryPort (progress display), OutfitSuggestionPort (GetDailyOutfit)
  # Business rule BR-01: first outfit unlocked when wardrobe.item_count >= 5

  Background:
    Given Sofia has completed style calibration with archetype "Classic" and occasion "Work"

  @smoke
  Scenario: Adding the 5th item triggers a celebration and shows the first outfit
    Given Sofia has 4 confirmed items in her wardrobe
    And this is her first time reaching the 5-item milestone
    When she confirms her 5th item — a camel knit turtleneck
    Then a celebration animation plays once
    And within 2 seconds the screen transitions to her first outfit suggestion
    And the outfit is composed of items from her wardrobe
    And the outfit contains at least 3 of her items

  @smoke
  Scenario: Progress indicator reflects confirmed item count accurately
    Given Sofia's wardrobe has 2 confirmed items
    And 1 item upload is currently in progress
    When she views the wardrobe grid
    Then the progress indicator shows "2 of 5 items"
    And the in-progress item is not included in the count
    When the upload completes successfully
    Then the progress indicator updates to "3 of 5 items" without a page refresh

  @edge-case
  Scenario: Progress is retained when Sofia closes the app and returns the next day
    Given Sofia added 3 items on Sunday evening
    And she closed the app before reaching 5 items
    When she reopens PocketWardrobe on Monday morning
    Then the progress indicator shows "3 of 5 items"
    And she can continue from where she left off
    And none of her previously added items are lost

  @edge-case
  Scenario: Celebration animation does not replay after the first threshold crossing
    Given Sofia has already reached 5 items and seen the celebration animation
    When she adds a 6th item to her wardrobe
    Then no celebration animation plays
    And the new item is simply added to her wardrobe grid

  @pending
  @edge-case
  Scenario: Sofia reaches 5 items but none match her primary occasion
    Given Sofia's style profile primary occasion is "Work"
    And all 5 of her wardrobe items are tagged "Casual" only
    When she confirms her 5th item and the outfit unlock triggers
    Then the app presents a casual outfit built from her 5 items
    And the outfit card shows occasion label "Casual"
    And a message reads "Add one work-appropriate item to get your first work outfit"
    And an outfit is still shown — no error or empty screen appears

  @pending
  @edge-case
  Scenario: A pending item upload does not count toward the progress bar
    Given Sofia's wardrobe has 4 confirmed items
    And she has 1 item upload in progress that has not completed
    When she views the progress indicator
    Then it reads "4 of 5 items"
    And the celebration does not trigger until the 5th upload fully completes

  @pending
  @error-path
  Scenario: Outfit generation fails at the 5-item threshold and Sofia is not blocked
    Given Sofia has 4 confirmed items in her wardrobe
    And the outfit suggestion service is temporarily unavailable
    When she confirms her 5th item
    Then no error message blocks the screen
    And she sees "Your first outfit is being prepared — check back in a moment"
    And the celebration animation still plays

  @pending
  @error-path
  Scenario: Item count shown to Sofia is never higher than confirmed items
    Given Sofia has 3 confirmed items and 2 items still uploading
    When she views her wardrobe at any point during the uploads
    Then the progress indicator never shows more than 3 of 5 items
    And draft or in-progress items are never surfaced as part of her wardrobe count
