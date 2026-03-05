# Appointment Rescheduling

This folder contains documentation related to appointment rescheduling functionality and visit number management.

## Documentation Files

### **[Visit Number Reordering](./visit-number-reordering-fix.md)**
Comprehensive documentation about visit number reordering with True Chronological Order implementation.

**Key Features:**
- True Chronological Order for all visits (including completed)
- No Unique Constraint Violations with two-pass approach
- Data Anomaly Handling for visits not starting from 1
- Complete test coverage and examples

### **[Appointment Rescheduling](./appointment-rescheduling.md)**
Complete rescheduling workflow documentation.

**Topics Covered:**
- Rescheduling process and workflows
- UI components and user interactions
- Business logic and validation rules
- Error handling and edge cases

## Related Documentation

- **[Appointment Management](../appointment-management.md)** - Core appointment system documentation
- **[Query Architecture](../appointment-query-architecture.md)** - Registration number-based queries
- **[Appointment Query Architecture](../appointment-query-architecture.md)** - Technical query implementation

## Implementation Notes

All rescheduling operations use the **True Chronological Order** principle:
- Visit numbers follow actual date sequence
- Completed visits are renumbered when chronological position changes
- Data anomalies are automatically corrected
- No unique constraint violations occur

## Quick Reference

```ruby
# True Chronological Reordering
all_visits_chronological = scheduled_visits.sort_by(&:appointment_date_time)

# Two-pass safe reordering
# First: Temporary negative numbers
# Second: Sequential chronological numbering
```
