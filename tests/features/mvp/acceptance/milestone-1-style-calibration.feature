@milestone_1
Feature: First-time style calibration
  As a new PocketWardrobe user
  I want to answer a few short style questions
  So that the app personalises outfit suggestions to my taste without a lengthy setup form

  # US-01: Style Calibration
  # Driving port: StyleCalibrationPort
  # Commands: CompleteCalibration, SkipCalibration, UpdateStyleProfile

  Background:
    Given the style calibration screen presents exactly 3 questions

  @smoke
  Scenario: Sofia completes style calibration and her profile is saved
    Given Sofia has opened PocketWardrobe for the first time
    And she has not previously completed any style questions
    When she selects "Classic" as her style archetype
    And she selects "Work" and "Casual" as her occasion priorities
    And she selects "Neutral palette" as her colour preference
    And she confirms her calibration
    Then her style profile is saved with archetype "Classic", occasions "Work and Casual", and palette "Neutral"
    And she is navigated to the item capture screen
    And the progress indicator shows "0 of 5 — add 5 items to see your first outfit"
    And the calibration screen is not shown again on her next launch

  @smoke
  Scenario: Marco dismisses style calibration and receives a default profile
    Given Marco has opened PocketWardrobe for the first time
    When he dismisses the style calibration screen without answering any questions
    Then a default style profile is created with archetype "Classic", occasions "Work and Casual", and palette "Neutral"
    And he is navigated to the item capture screen
    And a notice reads "Complete your style profile for better suggestions"
    And tapping the notice opens the style calibration screen

  @edge-case
  Scenario: Sofia updates her style profile 2 weeks after onboarding
    Given Sofia completed style calibration 14 days ago with archetype "Classic"
    And she has navigated to her style profile settings
    When she changes her style archetype to "Minimalist"
    And saves the change
    Then her style profile is updated to archetype "Minimalist"
    And her next daily outfit suggestion uses the updated archetype
    And her wardrobe items and their occasion tags are unchanged

  @pending
  @edge-case
  Scenario: Sofia sees a dismiss option on every calibration question screen
    Given Sofia has opened the style calibration screen
    When she advances to the second question
    Then a visible dismiss option is available on the second question screen
    When she advances to the third question
    Then a visible dismiss option is available on the third question screen
    When she dismisses from the third question
    Then a default style profile is created
    And she is navigated to the item capture screen

  @pending
  @edge-case
  Scenario: Calibration completes in under 60 seconds
    Given Sofia has opened PocketWardrobe for the first time
    When she answers all 3 style questions at a natural reading pace
    Then the calibration sequence is completable in under 60 seconds

  @pending
  @error-path
  Scenario: Style profile is unavailable when outfit suggestion is requested
    Given Sofia has completed style calibration
    And her style profile cannot be retrieved when the outfit engine runs
    When the outfit suggestion is generated
    Then the outfit uses the default classic work neutral profile as a fallback
    And the outfit is still presented — no error or empty screen is shown

  @pending
  @error-path
  Scenario: Calibration submission fails and Sofia can retry
    Given Sofia has answered all 3 style questions
    And the profile save encounters a transient failure
    When she taps "Confirm"
    Then she sees a message "We could not save your profile right now — please try again"
    And her answers are preserved on screen so she does not need to re-enter them
    And tapping "Try again" re-submits successfully
