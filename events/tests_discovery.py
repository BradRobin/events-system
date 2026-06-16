from django.test import SimpleTestCase

from events.discovery import (
    extract_event_terms,
    filter_events_by_search,
    sort_events_by_platform,
    KENYA_EVENT_PLATFORMS,
)


class DiscoveryHelpersTests(SimpleTestCase):
    def test_extract_event_terms_removes_county(self):
        self.assertEqual(extract_event_terms('jazz Nairobi', 'Nairobi'), 'jazz')

    def test_filter_events_by_search_matches_title(self):
        events = [
            {'title': 'Nairobi Jazz Night', 'description': '', 'venue': 'Nairobi', 'date_text': ''},
            {'title': 'Food Festival', 'description': '', 'venue': 'Mombasa', 'date_text': ''},
        ]
        filtered = filter_events_by_search(events, 'jazz')
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]['title'], 'Nairobi Jazz Night')

    def test_sort_events_by_platform_priority(self):
        events = [
            {'source': 'Eventbrite', 'title': 'B'},
            {'source': 'Ticketsasa', 'title': 'A'},
            {'source': 'Mookh', 'title': 'C'},
        ]
        sorted_events = sort_events_by_platform(events)
        self.assertEqual(sorted_events[0]['source'], 'Ticketsasa')
        self.assertEqual(sorted_events[1]['source'], 'Mookh')

    def test_platform_list_has_ten_sources(self):
        self.assertEqual(len(KENYA_EVENT_PLATFORMS), 10)
        names = [p['name'] for p in KENYA_EVENT_PLATFORMS]
        self.assertEqual(names[0], 'EventHub')
        self.assertIn('Pata Ticket', names)
