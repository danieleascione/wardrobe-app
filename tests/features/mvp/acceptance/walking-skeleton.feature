@walking_skeleton
Feature: User digitizes wardrobe and receives first outfit suggestion
  As a first-time PocketWardrobe user
  I want to calibrate my style and photograph my clothes
  So that I receive a personally curated outfit suggestion that proves the app understands my taste

  Background:
    Given Sofia is a new PocketWardrobe user
    And the AI image service returns accurate classifications
    And the weather service reports 12 degrees Celsius and partly cloudy in Milan

  @smoke
  Scenario: Sofia calibrates her style, digitizes 5 items, and unlocks her first outfit
    Given Sofia opens PocketWardrobe for the first time
    When she selects "Classic" as her style archetype
    And she selects "Work" and "Casual" as her occasion priorities
    And she selects "Neutral palette" as her colour preference
    And she confirms her style calibration
    Then her style profile is saved with archetype "Classic", occasions "Work and Casual", and palette "Neutral"
    And she is shown the item capture screen with a progress indicator reading "0 of 5 items"
    When she photographs and confirms her "camel trench coat"
    Then the progress indicator reads "1 of 5 items"
    When she photographs and confirms her "white silk blouse"
    Then the progress indicator reads "2 of 5 items"
    When she photographs and confirms her "dark slim trousers"
    Then the progress indicator reads "3 of 5 items"
    When she photographs and confirms her "ankle boots"
    Then the progress indicator reads "4 of 5 items"
    When she photographs and confirms her "camel knit turtleneck"
    Then a celebration animation plays
    And within 2 seconds she sees her first outfit suggestion
    And the outfit contains at least 3 items from her wardrobe
    And the outfit card shows occasion label "Work"
    And the outfit card shows weather context "Milan, 12°C, partly cloudy"
    And she can accept the outfit as her choice for today
