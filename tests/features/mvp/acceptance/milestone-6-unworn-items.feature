@milestone_6
Feature: Unworn item awareness
  As an established PocketWardrobe user with a growing wardrobe
  I want to see which clothes I have not worn recently
  So that I can rediscover forgotten items and get outfits that make full use of my wardrobe

  # US-06: Daily Outfit Habit and Unworn Item Awareness
  # Driving port: WardrobeQueryPort
  # Queries: GetUnwornItems(userId), GetWardrobeStats(userId)
  # Also: OutfitSuggestionPort.GenerateOutfitForItem(userId, focusItemId)
  # Eligibility gate: >= 15 items AND >= 7 days of use
  # "Unworn" definition: 0 wear events in past 30 days AND item added > 14 days ago

  Background:
    Given Sofia has been using PocketWardrobe for 10 days
    And her wardrobe has 18 confirmed items

  @smoke
  Scenario: Sofia sees how many items she has not worn this month
    Given 11 of Sofia's 18 items have not been worn in the past 30 days
    And those 11 items were each added more than 14 days ago
    When she views her daily outfit card
    Then the outfit card footer shows "Your wardrobe: 18 items"
    And it shows "Unworn this month: 11 items" with a tappable link

  @smoke
  Scenario: Sofia generates an outfit centred on her forgotten mustard blazer
    Given Sofia's mustard yellow blazer has not been worn in 30 days
    And she is viewing her unworn items
    When she taps on the mustard yellow blazer
    Then an outfit suggestion is generated that includes the mustard blazer
    And the blazer is presented as the focus piece in the outfit
    And the other outfit items complement the blazer's colour and occasion tags
    And today's weather context is shown on the outfit card

  @smoke
  Scenario: Unworn tracker does not appear for a new user who is below the threshold
    Given Sofia has been using PocketWardrobe for 4 days
    And her wardrobe has 8 confirmed items
    When she views her daily outfit card
    Then no "Unworn this month" stat is shown
    And no wardrobe stats section appears in the outfit card footer

  @edge-case
  Scenario: All of Sofia's items have been worn this month
    Given Sofia's wardrobe has 15 confirmed items
    And all 15 items have at least one accepted wear event in the past 30 days
    When she views her daily outfit card
    Then the footer shows "Your wardrobe: 15 items"
    And it shows "Your wardrobe is working hard" instead of an unworn count
    And no link to see unworn items is shown

  @edge-case
  Scenario: Unworn items are sorted by longest time since last worn
    Given Sofia's wardrobe contains several items with varying wear dates
    And her mustard blazer was last worn 60 days ago
    And her floral midi skirt was last worn 45 days ago
    And her burgundy roll-neck was last worn 32 days ago
    When she views her unworn items grid
    Then the mustard blazer appears first
    And the floral midi skirt appears second
    And the burgundy roll-neck appears third

  @pending
  @edge-case
  Scenario: An item added 10 days ago is not shown as unworn even if never worn
    Given Sofia added a new white linen shirt 10 days ago
    And the linen shirt has never been worn
    When she views her unworn items grid
    Then the white linen shirt is not included in the unworn list
    And the unworn list shows only items added more than 14 days ago

  @pending
  @edge-case
  Scenario: Viewing an outfit featuring an unworn item does not mark it as worn
    Given Sofia's mustard blazer has 0 wear events in the past 30 days
    When she taps the blazer to generate an outfit around it
    And views the outfit suggestion
    Then the blazer's wear count remains 0
    And the blazer is still shown as an unworn item
    And a wear event is only created when she explicitly accepts the outfit

  @pending
  @edge-case
  Scenario: Unworn tracker becomes visible the day Sofia crosses the 15-item threshold
    Given Sofia has been using PocketWardrobe for 12 days
    And she has 14 confirmed items in her wardrobe
    When she views her daily outfit card
    Then no unworn stats section is shown
    When she adds a 15th confirmed item
    And views the daily outfit card again
    Then the wardrobe stats section becomes visible for the first time

  @pending
  @error-path
  Scenario: Unworn items grid cannot load and Sofia sees a helpful message
    Given Sofia qualifies for the unworn tracker (18 items, 10 days)
    And she taps the unworn items link on the outfit card
    And the wardrobe data is temporarily unavailable
    Then she sees "We could not load your unworn items right now — please try again"
    And a retry option is available
    And the rest of the daily outfit card remains visible and functional

  @pending
  @error-path
  Scenario: Generating an outfit for an unworn focus item fails gracefully
    Given Sofia taps her mustard blazer to generate an outfit around it
    And the outfit suggestion service encounters an error
    Then she sees "We could not build an outfit right now — please try again"
    And the mustard blazer remains in her unworn items grid
    And she can tap it again to retry
