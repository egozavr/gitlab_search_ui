import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GitlabConfigDialogComponent } from './gitlab-config-dialog.component';

describe('GitlabConfigDialogComponent', () => {
  let component: GitlabConfigDialogComponent;
  let fixture: ComponentFixture<GitlabConfigDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GitlabConfigDialogComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GitlabConfigDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
