# Future Considerations - Post V1

This document outlines planned improvements and optimizations that are **not blocking V1** but should be addressed as the system scales.

---

## 🔍 1. Firestore Query Scale

### Current State
- Queries work fine for small-medium datasets (< 1000 students per class)
- Direct Firestore queries for analytics
- Real-time listeners for live updates

### Future Needs
As data grows, analytics queries may become slow:

```typescript
// Current: Direct query
const attemptsQuery = query(
  collection(firestore, 'attempts'),
  where('examId', '==', examId)
);
```

### Solutions (Post-V1)

#### Option A: Precomputed Analytics Documents
```typescript
// Create aggregated analytics document
const analyticsDoc = {
  quizId: 'quiz123',
  averageScore: 75.5,
  medianScore: 78,
  completionRate: 85,
  conceptInsights: [...],
  lastUpdated: timestamp,
  // Updated via Cloud Function on attempt completion
};
```

#### Option B: Scheduled Aggregation Jobs
- Cloud Functions scheduled job (daily/hourly)
- Aggregates attempt data into analytics documents
- Reduces read costs and improves performance

#### Option C: Composite Indexes
- Create Firestore composite indexes for complex queries
- Required for queries with multiple `where` clauses

**Priority:** Medium  
**Timeline:** When analytics queries exceed 1-2 seconds  
**Impact:** Performance optimization, not blocking

---

## 📝 2. Quiz Publishing State

### Current State
- Quiz is implicitly "published" after teacher review
- No draft/archived states

### Future Enhancement

```typescript
export type Quiz = {
  // ... existing fields
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  archivedAt?: string;
};
```

### Use Cases
- **Draft:** Teacher creates quiz but not ready to assign
- **Published:** Quiz is live and can be assigned
- **Archived:** Quiz is no longer active but kept for reference

### Implementation
- Add `status` field to Quiz type
- Update quiz creation flow
- Add status filter in quiz list
- Prevent assignment of draft/archived quizzes

**Priority:** Low  
**Timeline:** When teachers request draft functionality  
**Impact:** UX improvement, not blocking

---

## 🔒 3. Permissions Enforcement (Backend)

### Current State
- Frontend route guards prevent unauthorized access
- No server-side enforcement

### Future: Firestore Security Rules

```javascript
// Example Firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only instructors can create/edit quizzes
    match /quizzes/{quizId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'instructor';
    }
    
    // Only class teachers can view class analytics
    match /classes/{classId} {
      allow read: if request.auth != null && 
                     (resource.data.createdBy == request.auth.uid || 
                      request.auth.uid in resource.data.enrolledStudentIds);
      allow write: if request.auth != null && 
                      resource.data.createdBy == request.auth.uid;
    }
    
    // Students can only read their own attempts
    match /attempts/{attemptId} {
      allow read: if request.auth != null && 
                     (resource.data.studentId == request.auth.uid ||
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'instructor');
      allow write: if request.auth != null && 
                      resource.data.studentId == request.auth.uid;
    }
  }
}
```

### Implementation Steps
1. Define security rules in `firestore.rules`
2. Test rules with Firestore emulator
3. Deploy rules to production
4. Update frontend to handle permission errors gracefully

**Priority:** High (before production scale)  
**Timeline:** Before public launch  
**Impact:** Security hardening, critical for production

---

## 📊 4. Export Functionality

### Current State
- Export button exists in analytics dashboard
- Backend implementation pending

### Future Implementation

#### CSV Export
```typescript
// Export class performance to CSV
const exportClassPerformance = async (classId: string) => {
  const data = await fetchClassAnalytics(classId);
  const csv = convertToCSV(data);
  downloadFile(csv, `class-${classId}-performance.csv`);
};
```

#### PDF Reports
- Use library like `jsPDF` or `pdfkit`
- Generate formatted reports with charts
- Include concept insights, student breakdowns

**Priority:** Medium  
**Timeline:** When teachers request export feature  
**Impact:** Convenience feature, not blocking

---

## 🔔 5. Notification System

### Future Features
- Email notifications for:
  - Quiz assignments
  - Due date reminders
  - Grade availability
- In-app notifications
- Push notifications (mobile)

**Priority:** Low  
**Timeline:** Post-V1 enhancement  
**Impact:** UX improvement

---

## 📱 6. Mobile App

### Future Consideration
- React Native app
- Offline quiz taking
- Push notifications
- Mobile-optimized UI

**Priority:** Low  
**Timeline:** Post-V1  
**Impact:** Platform expansion

---

## 🎯 Priority Summary

| Feature | Priority | Timeline | Blocking? |
|---------|----------|---------|-----------|
| Firestore Security Rules | High | Pre-production | Yes (security) |
| Export Functionality | Medium | Post-V1 | No |
| Query Optimization | Medium | When scaling | No |
| Quiz Publishing States | Low | When requested | No |
| Notifications | Low | Post-V1 | No |
| Mobile App | Low | Future | No |

---

## ✅ V1 Status

**All V1 features are complete and production-ready.**

Future considerations listed above are **enhancements**, not blockers. The system is fully functional and can be deployed as-is.

---

**Last Updated:** V1 Complete  
**Next Review:** After initial production deployment

