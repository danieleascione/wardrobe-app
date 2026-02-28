@milestone_5
Feature: Item swap within a daily outfit suggestion
  As a regular PocketWardrobe user
  I want to replace a single item in my suggested outfit
  So that I can keep a combination I like while adapting one element to my needs that day

  # US-05: Item Swap Within Daily Outfit
  # Driving port: OutfitSuggestionPort
  # Commands: SwapItem(userId, outfitId, removeItemId, addItemId)
  #           AcceptOutfit(userId, outfitId, finalItemIds)
  # Business rule BR-05: WearEvent created only on explicit accept, not on swap or view

  Background:
    Given Sofia has 12 confirmed items in her wardrobe
    And she is viewing her daily outfit suggestion

  @smoke
  Scenario: Sofia swaps the suggested loafers for her ankle boots
    Given the daily outfit includes brown loafers
    And her wardrobe contains 4 footwear items including black ankle boots
    When she taps on the loafers in the outfit
    Then a selection drawer opens showing her 4 footwear items
    And the current loafers are marked as currently selected
    When she selects her black ankle boots
    Then the drawer closes
    And the outfit updates to show the ankle boots within 1 second
    And the outfit is ready to be saved with the ankle boots as her chosen footwear

  @smoke
  Scenario: Sofia saves a modified outfit after swapping shoes
    Given Sofia has swapped the suggested loafers for her ankle boots
    And the outfit now shows camel coat, white blouse, dark trousers, and ankle boots
    When she taps "This works for me"
    Then the outfit is recorded as accepted with the ankle boots included
    And a wear event is created recording all 4 items as worn today
    And the worn count increases for each of the 4 items
    And the original unmodified outfit suggestion remains unchanged

  @edge-case
  Scenario: Sofia dismisses the swap drawer without making a change
    Given the daily outfit includes brown loafers
    When she taps the loafers to open the swap drawer
    And dismisses the drawer without selecting an alternative
    Then the outfit remains unchanged with the brown loafers
    And no wear event is created

  @edge-case
  Scenario: Sofia tries to swap her only coat and sees an informative message
    Given the daily outfit includes her camel trench coat
    And her wardrobe contains exactly 1 coat
    When she taps the coat to open the swap drawer
    Then a selection drawer opens showing only the camel trench coat
    And a message reads "You only have one coat — add more to your wardrobe for variety"
    And a link to add more items is visible
    And the coat remains in the outfit — no empty state is shown

  @pending
  @edge-case
  Scenario: Swap state is reset if Sofia leaves the app and returns
    Given Sofia has swapped the loafers for ankle boots but not yet saved the outfit
    When she closes the app and reopens it
    Then the daily outfit is shown in its original form with the loafers
    And no unsaved swap is persisted

  @pending
  @edge-case
  Scenario: Sofia swaps a top for a more formal alternative before a client meeting
    Given the daily outfit includes a white t-shirt
    And her wardrobe contains 6 tops including a structured silk blouse
    When she taps the white t-shirt in the outfit
    And selects the structured silk blouse from the drawer
    Then the outfit updates to show the structured silk blouse
    And she can save the modified outfit as her wear event for today

  @pending
  @error-path
  Scenario: The swap drawer cannot load wardrobe items for the selected category
    Given Sofia taps an item to swap it
    And the wardrobe data is temporarily unavailable
    When the swap drawer attempts to load alternatives
    Then she sees "We could not load your items right now — please try again"
    And the drawer remains open so she can retry
    And the outfit is unchanged

  @pending
  @error-path
  Scenario: Saving a modified outfit fails and Sofia is informed
    Given Sofia has swapped the loafers for ankle boots
    When she taps "This works for me"
    And the save encounters a transient error
    Then she sees "We could not save your outfit — please try again"
    And her swap selection is preserved so she does not need to redo it
    And tapping "Try again" re-submits the wear event
